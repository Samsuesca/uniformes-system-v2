"""
Cash Register Service

Servicio para gestionar la Caja Menor y su liquidacion a Caja Mayor.

Flujo:
1. Ventas en efectivo van a Caja Menor (1101)
2. Al final del dia, vendedor liquida Caja Menor a Caja Mayor (1102)
3. Caja Mayor acumula el efectivo consolidado
"""
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import (
    BalanceAccount,
    BalanceEntry,
    AccountType
)
from app.services.balance_integration import (
    BalanceIntegrationService,
    DEFAULT_ACCOUNTS
)


class CashRegisterService:
    """
    Servicio para gestionar operaciones de Caja Menor.

    Responsabilidades:
    - Obtener saldo actual de Caja Menor
    - Liquidar Caja Menor a Caja Mayor
    - Historial de liquidaciones
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.balance_service = BalanceIntegrationService(db)

    async def get_caja_menor_balance(self) -> dict:
        """
        Obtiene el saldo actual de Caja Menor.

        Returns:
            Dict con informacion de la cuenta:
            {
                "id": UUID,
                "name": str,
                "code": str,
                "balance": Decimal,
                "last_updated": datetime
            }
        """
        account = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_menor"]["code"]
        )

        if not account:
            # Crear cuentas si no existen
            await self.balance_service.get_or_create_global_accounts()
            account = await self.balance_service.get_global_account(
                DEFAULT_ACCOUNTS["caja_menor"]["code"]
            )

        if account:
            return {
                "id": str(account.id),
                "name": account.name,
                "code": account.code,
                "balance": account.balance,
                "last_updated": account.updated_at.isoformat() if account.updated_at else None
            }

        return {
            "id": None,
            "name": "Caja Menor",
            "code": "1101",
            "balance": Decimal("0"),
            "last_updated": None
        }

    async def get_caja_mayor_balance(self) -> dict:
        """
        Obtiene el saldo actual de Caja Mayor.

        Returns:
            Dict con informacion de la cuenta
        """
        account = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_mayor"]["code"]
        )

        if not account:
            await self.balance_service.get_or_create_global_accounts()
            account = await self.balance_service.get_global_account(
                DEFAULT_ACCOUNTS["caja_mayor"]["code"]
            )

        if account:
            return {
                "id": str(account.id),
                "name": account.name,
                "code": account.code,
                "balance": account.balance,
                "last_updated": account.updated_at.isoformat() if account.updated_at else None
            }

        return {
            "id": None,
            "name": "Caja Mayor",
            "code": "1102",
            "balance": Decimal("0"),
            "last_updated": None
        }

    async def liquidate_to_caja_mayor(
        self,
        amount: Decimal,
        notes: str | None = None,
        created_by: UUID | None = None
    ) -> dict:
        """
        Liquida (transfiere) un monto de Caja Menor a Caja Mayor.

        Args:
            amount: Monto a liquidar
            notes: Notas opcionales de la liquidacion
            created_by: ID del usuario que realiza la liquidacion

        Returns:
            Dict con resultado de la liquidacion:
            {
                "success": bool,
                "message": str,
                "caja_menor_balance": Decimal,
                "caja_mayor_balance": Decimal,
                "amount_liquidated": Decimal,
                "entry_from": dict,
                "entry_to": dict
            }

        Raises:
            ValueError: Si el monto es invalido o excede el saldo disponible
        """
        if amount <= 0:
            raise ValueError("El monto a liquidar debe ser mayor a 0")

        # Obtener cuenta Caja Menor
        caja_menor = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_menor"]["code"]
        )

        if not caja_menor:
            await self.balance_service.get_or_create_global_accounts()
            caja_menor = await self.balance_service.get_global_account(
                DEFAULT_ACCOUNTS["caja_menor"]["code"]
            )

        if not caja_menor:
            raise ValueError("No se encontro la cuenta Caja Menor")

        # Validar saldo suficiente
        if caja_menor.balance < amount:
            raise ValueError(
                f"Saldo insuficiente en Caja Menor. "
                f"Disponible: ${caja_menor.balance:,.2f}, "
                f"Solicitado: ${amount:,.2f}"
            )

        # Obtener cuenta Caja Mayor
        caja_mayor = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_mayor"]["code"]
        )

        if not caja_mayor:
            raise ValueError("No se encontro la cuenta Caja Mayor")

        # Realizar la transferencia
        description = notes or "Liquidacion de Caja Menor"
        timestamp = datetime.utcnow()

        # Descontar de Caja Menor
        caja_menor.balance -= amount
        entry_from = BalanceEntry(
            account_id=caja_menor.id,
            school_id=None,  # Liquidaciones son globales
            entry_date=date.today(),
            amount=-amount,
            balance_after=caja_menor.balance,
            description=f"Liquidacion a Caja Mayor: {description}",
            reference=f"LIQ-{timestamp.strftime('%Y%m%d%H%M%S')}",
            created_by=created_by
        )
        self.db.add(entry_from)

        # Agregar a Caja Mayor
        caja_mayor.balance += amount
        entry_to = BalanceEntry(
            account_id=caja_mayor.id,
            school_id=None,
            entry_date=date.today(),
            amount=amount,
            balance_after=caja_mayor.balance,
            description=f"Recibido de Caja Menor: {description}",
            reference=f"LIQ-{timestamp.strftime('%Y%m%d%H%M%S')}",
            created_by=created_by
        )
        self.db.add(entry_to)

        await self.db.flush()

        return {
            "success": True,
            "message": f"Liquidacion exitosa: ${amount:,.2f} transferidos a Caja Mayor",
            "caja_menor_balance": caja_menor.balance,
            "caja_mayor_balance": caja_mayor.balance,
            "amount_liquidated": amount,
            "entry_from": {
                "id": str(entry_from.id),
                "amount": entry_from.amount,
                "balance_after": entry_from.balance_after,
                "description": entry_from.description
            },
            "entry_to": {
                "id": str(entry_to.id),
                "amount": entry_to.amount,
                "balance_after": entry_to.balance_after,
                "description": entry_to.description
            }
        }

    async def get_liquidation_history(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 50
    ) -> list[dict]:
        """
        Obtiene historial de liquidaciones de Caja Menor a Caja Mayor.

        Args:
            start_date: Fecha inicial (opcional)
            end_date: Fecha final (opcional)
            limit: Limite de registros

        Returns:
            Lista de liquidaciones con detalles
        """
        # Obtener cuenta Caja Mayor (las liquidaciones se registran como ingresos ahi)
        caja_mayor = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_mayor"]["code"]
        )

        if not caja_mayor:
            return []

        # Buscar entries de liquidacion (las que tienen referencia LIQ-)
        query = select(BalanceEntry).where(
            BalanceEntry.account_id == caja_mayor.id,
            BalanceEntry.reference.like("LIQ-%"),
            BalanceEntry.amount > 0  # Solo ingresos (recibidos de Caja Menor)
        )

        if start_date:
            query = query.where(BalanceEntry.entry_date >= start_date)
        if end_date:
            query = query.where(BalanceEntry.entry_date <= end_date)

        query = query.order_by(BalanceEntry.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        entries = result.scalars().all()

        return [
            {
                "id": str(entry.id),
                "date": entry.entry_date.isoformat(),
                "amount": entry.amount,
                "balance_after": entry.balance_after,
                "description": entry.description,
                "reference": entry.reference,
                "created_at": entry.created_at.isoformat() if entry.created_at else None
            }
            for entry in entries
        ]

    async def get_today_summary(self) -> dict:
        """
        Obtiene resumen de operaciones del dia para Caja Menor.

        Returns:
            Dict con resumen:
            {
                "caja_menor_balance": Decimal,
                "caja_mayor_balance": Decimal,
                "today_liquidations": Decimal,
                "today_entries_count": int
            }
        """
        today = date.today()

        # Obtener saldos actuales
        caja_menor = await self.get_caja_menor_balance()
        caja_mayor = await self.get_caja_mayor_balance()

        # Obtener cuenta Caja Menor para queries
        caja_menor_account = await self.balance_service.get_global_account(
            DEFAULT_ACCOUNTS["caja_menor"]["code"]
        )

        today_liquidations = Decimal("0")
        today_entries_count = 0

        if caja_menor_account:
            # Contar entries de hoy en Caja Menor
            count_result = await self.db.execute(
                select(func.count(BalanceEntry.id)).where(
                    BalanceEntry.account_id == caja_menor_account.id,
                    BalanceEntry.entry_date == today
                )
            )
            today_entries_count = count_result.scalar() or 0

            # Suma de liquidaciones de hoy (montos negativos que son liquidaciones)
            liq_result = await self.db.execute(
                select(func.sum(func.abs(BalanceEntry.amount))).where(
                    BalanceEntry.account_id == caja_menor_account.id,
                    BalanceEntry.entry_date == today,
                    BalanceEntry.reference.like("LIQ-%")
                )
            )
            today_liquidations = liq_result.scalar() or Decimal("0")

        return {
            "caja_menor_balance": caja_menor["balance"],
            "caja_mayor_balance": caja_mayor["balance"],
            "today_liquidations": today_liquidations,
            "today_entries_count": today_entries_count,
            "date": today.isoformat()
        }
