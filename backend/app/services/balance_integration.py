"""
Balance Integration Service

Integra transacciones con cuentas del balance general.
Cuando se crea una transacción, automáticamente actualiza
la cuenta correspondiente (Caja para efectivo, Banco para transferencias).
"""
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.accounting import (
    Transaction,
    TransactionType,
    AccPaymentMethod,
    BalanceAccount,
    BalanceEntry,
    AccountType
)
from app.models.school import School


# Códigos estándar de contabilidad para cuentas default
DEFAULT_ACCOUNTS = {
    "caja": {
        "name": "Caja",
        "code": "1101",
        "description": "Efectivo en caja",
        "account_type": AccountType.ASSET_CURRENT
    },
    "banco": {
        "name": "Banco",
        "code": "1102",
        "description": "Cuentas bancarias",
        "account_type": AccountType.ASSET_CURRENT
    }
}

# Mapeo de payment_method a tipo de cuenta
PAYMENT_METHOD_TO_ACCOUNT = {
    AccPaymentMethod.CASH: "caja",       # Efectivo -> Caja
    AccPaymentMethod.TRANSFER: "banco",  # Transferencia -> Banco
    AccPaymentMethod.CARD: "banco",      # Tarjeta -> Banco (cuando se deposita)
    AccPaymentMethod.CREDIT: None,       # Crédito -> No afecta cuentas (genera CxC/CxP)
    AccPaymentMethod.OTHER: None         # Otro -> Configurable (por defecto no afecta)
}


class BalanceIntegrationService:
    """
    Servicio para integrar transacciones con cuentas del balance.

    Responsabilidades:
    - Crear cuentas default (Caja, Banco) para cada colegio
    - Mapear payment_method a la cuenta correspondiente
    - Actualizar saldos de cuentas al crear transacciones
    - Crear entradas de auditoría (BalanceEntry)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_default_accounts(
        self,
        school_id: UUID,
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Obtiene o crea las cuentas default (Caja, Banco) para un colegio.

        Args:
            school_id: ID del colegio
            created_by: ID del usuario que crea las cuentas

        Returns:
            Dict con {tipo: uuid} para cada cuenta creada/existente
            Ej: {"caja": UUID(...), "banco": UUID(...)}
        """
        accounts_map = {}

        for account_key, account_config in DEFAULT_ACCOUNTS.items():
            # Buscar cuenta existente por código
            result = await self.db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.school_id == school_id,
                    BalanceAccount.code == account_config["code"],
                    BalanceAccount.is_active == True
                )
            )
            account = result.scalar_one_or_none()

            if not account:
                # Crear cuenta si no existe
                account = BalanceAccount(
                    school_id=school_id,
                    account_type=account_config["account_type"],
                    name=account_config["name"],
                    code=account_config["code"],
                    description=account_config["description"],
                    balance=Decimal("0"),
                    created_by=created_by,
                    is_active=True
                )
                self.db.add(account)
                await self.db.flush()

            accounts_map[account_key] = account.id

        # Guardar mapping en school.settings para referencia rápida
        await self._update_school_account_mapping(school_id, accounts_map)

        return accounts_map

    async def get_account_for_payment_method(
        self,
        school_id: UUID,
        payment_method: AccPaymentMethod
    ) -> UUID | None:
        """
        Obtiene el ID de la cuenta de balance para un método de pago.

        Args:
            school_id: ID del colegio
            payment_method: Método de pago (CASH, TRANSFER, etc.)

        Returns:
            UUID de la cuenta de balance, o None si no aplica (ej: CREDIT)
        """
        account_key = PAYMENT_METHOD_TO_ACCOUNT.get(payment_method)

        if account_key is None:
            return None

        # Primero intentar obtener del school.settings (más rápido)
        result = await self.db.execute(
            select(School).where(School.id == school_id)
        )
        school = result.scalar_one_or_none()

        if school and school.settings:
            mapping = school.settings.get("payment_account_mapping", {})
            account_id = mapping.get(account_key)
            if account_id:
                return UUID(account_id) if isinstance(account_id, str) else account_id

        # Si no hay mapping, crear cuentas default
        accounts_map = await self.get_or_create_default_accounts(school_id)
        return accounts_map.get(account_key)

    async def apply_transaction_to_balance(
        self,
        transaction: Transaction,
        created_by: UUID | None = None
    ) -> BalanceEntry | None:
        """
        Aplica el efecto de una transacción a la cuenta de balance correspondiente.

        - INCOME con CASH -> +amount a Caja
        - INCOME con TRANSFER -> +amount a Banco
        - EXPENSE con CASH -> -amount de Caja
        - EXPENSE con TRANSFER -> -amount de Banco
        - CREDIT -> No afecta cuentas (retorna None)

        Args:
            transaction: La transacción a aplicar
            created_by: ID del usuario

        Returns:
            BalanceEntry creado, o None si no aplica
        """
        # CREDIT no afecta cuentas de balance
        if transaction.payment_method == AccPaymentMethod.CREDIT:
            return None

        # Obtener cuenta destino
        account_id = await self.get_account_for_payment_method(
            transaction.school_id,
            transaction.payment_method
        )

        if not account_id:
            return None

        # Obtener cuenta
        result = await self.db.execute(
            select(BalanceAccount).where(BalanceAccount.id == account_id)
        )
        account = result.scalar_one_or_none()

        if not account:
            return None

        # Calcular delta según tipo de transacción
        # INCOME = +amount (dinero entra)
        # EXPENSE = -amount (dinero sale)
        if transaction.type == TransactionType.INCOME:
            delta = transaction.amount
        elif transaction.type == TransactionType.EXPENSE:
            delta = -transaction.amount
        else:
            # TRANSFER: se maneja diferente (requiere cuenta origen y destino)
            return None

        # Actualizar balance de la cuenta
        new_balance = account.balance + delta
        account.balance = new_balance

        # Actualizar balance_account_id en la transacción
        transaction.balance_account_id = account_id

        # Crear BalanceEntry para auditoría
        entry = BalanceEntry(
            account_id=account_id,
            school_id=transaction.school_id,  # Required field
            entry_date=transaction.transaction_date,
            amount=delta,
            balance_after=new_balance,
            description=f"Auto: {transaction.description}",
            reference=transaction.reference_code,  # BalanceEntry uses 'reference' not 'reference_code'
            created_by=created_by
        )
        self.db.add(entry)

        await self.db.flush()

        return entry

    async def apply_transfer(
        self,
        transaction: Transaction,
        from_account_id: UUID,
        to_account_id: UUID,
        created_by: UUID | None = None
    ) -> tuple[BalanceEntry, BalanceEntry]:
        """
        Aplica una transferencia entre cuentas.

        Args:
            transaction: Transacción de tipo TRANSFER
            from_account_id: Cuenta origen
            to_account_id: Cuenta destino
            created_by: ID del usuario

        Returns:
            Tupla con (entry_from, entry_to)
        """
        # Obtener cuenta origen
        result = await self.db.execute(
            select(BalanceAccount).where(BalanceAccount.id == from_account_id)
        )
        from_account = result.scalar_one_or_none()

        # Obtener cuenta destino
        result = await self.db.execute(
            select(BalanceAccount).where(BalanceAccount.id == to_account_id)
        )
        to_account = result.scalar_one_or_none()

        if not from_account or not to_account:
            raise ValueError("Cuentas de transferencia no encontradas")

        amount = transaction.amount

        # Descontar de cuenta origen
        from_account.balance -= amount
        entry_from = BalanceEntry(
            account_id=from_account_id,
            school_id=transaction.school_id,  # Required field
            entry_date=transaction.transaction_date,
            amount=-amount,
            balance_after=from_account.balance,
            description=f"Transferencia a {to_account.name}: {transaction.description}",
            reference=transaction.reference_code,  # BalanceEntry uses 'reference'
            created_by=created_by
        )
        self.db.add(entry_from)

        # Agregar a cuenta destino
        to_account.balance += amount
        entry_to = BalanceEntry(
            account_id=to_account_id,
            school_id=transaction.school_id,  # Required field
            entry_date=transaction.transaction_date,
            amount=amount,
            balance_after=to_account.balance,
            description=f"Transferencia desde {from_account.name}: {transaction.description}",
            reference=transaction.reference_code,  # BalanceEntry uses 'reference'
            created_by=created_by
        )
        self.db.add(entry_to)

        # Actualizar transaction
        transaction.balance_account_id = from_account_id
        transaction.transfer_to_account_id = to_account_id

        await self.db.flush()

        return entry_from, entry_to

    async def get_cash_balances(self, school_id: UUID) -> dict:
        """
        Obtiene los saldos actuales de Caja y Banco.

        Args:
            school_id: ID del colegio

        Returns:
            Dict con información de saldos:
            {
                "caja": {"id": UUID, "name": str, "balance": Decimal},
                "banco": {"id": UUID, "name": str, "balance": Decimal},
                "total_liquid": Decimal
            }
        """
        # Obtener cuentas default
        accounts_map = await self.get_or_create_default_accounts(school_id)

        result = {
            "caja": None,
            "banco": None,
            "total_liquid": Decimal("0")
        }

        for account_key in ["caja", "banco"]:
            account_id = accounts_map.get(account_key)
            if account_id:
                account_result = await self.db.execute(
                    select(BalanceAccount).where(BalanceAccount.id == account_id)
                )
                account = account_result.scalar_one_or_none()
                if account:
                    result[account_key] = {
                        "id": str(account.id),
                        "name": account.name,
                        "balance": account.balance,
                        "last_updated": account.updated_at.isoformat() if account.updated_at else None
                    }
                    result["total_liquid"] += account.balance

        return result

    async def _update_school_account_mapping(
        self,
        school_id: UUID,
        accounts_map: dict[str, UUID]
    ) -> None:
        """
        Actualiza el mapping de cuentas en school.settings.

        Args:
            school_id: ID del colegio
            accounts_map: Dict {tipo: uuid}
        """
        result = await self.db.execute(
            select(School).where(School.id == school_id)
        )
        school = result.scalar_one_or_none()

        if school:
            settings = school.settings or {}

            # Convertir UUIDs a strings para JSON
            string_map = {k: str(v) for k, v in accounts_map.items()}

            settings["payment_account_mapping"] = string_map
            settings["default_cash_account_id"] = string_map.get("caja")
            settings["default_bank_account_id"] = string_map.get("banco")

            school.settings = settings
            await self.db.flush()

    async def initialize_default_accounts_for_school(
        self,
        school_id: UUID,
        caja_initial_balance: Decimal = Decimal("0"),
        banco_initial_balance: Decimal = Decimal("0"),
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Inicializa las cuentas default con saldos iniciales.
        Útil para configuración inicial del sistema.

        Args:
            school_id: ID del colegio
            caja_initial_balance: Saldo inicial de Caja
            banco_initial_balance: Saldo inicial de Banco
            created_by: ID del usuario

        Returns:
            Dict con {tipo: uuid}
        """
        accounts_map = {}

        for account_key, account_config in DEFAULT_ACCOUNTS.items():
            initial_balance = (
                caja_initial_balance if account_key == "caja"
                else banco_initial_balance if account_key == "banco"
                else Decimal("0")
            )

            # Buscar cuenta existente
            result = await self.db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.school_id == school_id,
                    BalanceAccount.code == account_config["code"]
                )
            )
            account = result.scalar_one_or_none()

            if account:
                # Actualizar balance si ya existe
                account.balance = initial_balance
            else:
                # Crear nueva cuenta
                account = BalanceAccount(
                    school_id=school_id,
                    account_type=account_config["account_type"],
                    name=account_config["name"],
                    code=account_config["code"],
                    description=account_config["description"],
                    balance=initial_balance,
                    created_by=created_by,
                    is_active=True
                )
                self.db.add(account)

            await self.db.flush()
            accounts_map[account_key] = account.id

            # Crear BalanceEntry inicial si hay balance
            if initial_balance != Decimal("0"):
                entry = BalanceEntry(
                    account_id=account.id,
                    entry_date=date.today(),
                    amount=initial_balance,
                    balance_after=initial_balance,
                    description="Saldo inicial",
                    created_by=created_by
                )
                self.db.add(entry)

        await self._update_school_account_mapping(school_id, accounts_map)
        await self.db.flush()

        return accounts_map
