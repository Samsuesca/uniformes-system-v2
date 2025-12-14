"""
Balance Integration Service

Integra transacciones con cuentas del balance general.
Cuando se crea una transacción, automáticamente actualiza
la cuenta correspondiente (Caja para efectivo, Banco para transferencias).

ARQUITECTURA GLOBAL:
- Las cuentas Caja y Banco son GLOBALES (school_id = NULL)
- El dinero de todas las ventas va a la misma Caja/Banco
- Las transacciones mantienen school_id para reportes por colegio
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


# Códigos estándar de contabilidad para cuentas default GLOBALES
DEFAULT_ACCOUNTS = {
    "caja": {
        "name": "Caja General",
        "code": "1101",
        "description": "Efectivo en caja (global del negocio)",
        "account_type": AccountType.ASSET_CURRENT
    },
    "banco": {
        "name": "Banco General",
        "code": "1102",
        "description": "Cuentas bancarias (global del negocio)",
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

    IMPORTANTE: Las cuentas Caja y Banco son GLOBALES (school_id = NULL).
    Esto significa que todas las ventas de todos los colegios van a la misma
    Caja/Banco del negocio.

    Responsabilidades:
    - Crear cuentas globales (Caja, Banco) si no existen
    - Mapear payment_method a la cuenta correspondiente
    - Actualizar saldos de cuentas al crear transacciones
    - Crear entradas de auditoría (BalanceEntry)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_global_accounts(
        self,
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Obtiene o crea las cuentas globales (Caja, Banco).

        Estas cuentas tienen school_id = NULL (son del negocio, no de un colegio).

        Args:
            created_by: ID del usuario que crea las cuentas

        Returns:
            Dict con {tipo: uuid} para cada cuenta creada/existente
            Ej: {"caja": UUID(...), "banco": UUID(...)}
        """
        accounts_map = {}

        for account_key, account_config in DEFAULT_ACCOUNTS.items():
            # Buscar cuenta global existente (school_id IS NULL)
            result = await self.db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.school_id.is_(None),  # Global account
                    BalanceAccount.code == account_config["code"],
                    BalanceAccount.is_active == True
                )
            )
            account = result.scalar_one_or_none()

            if not account:
                # Crear cuenta global si no existe
                account = BalanceAccount(
                    school_id=None,  # Global account
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

        return accounts_map

    async def get_global_account(self, code: str) -> BalanceAccount | None:
        """
        Obtiene una cuenta global por su código.

        Args:
            code: Código de la cuenta (ej: "1101" para Caja)

        Returns:
            BalanceAccount o None si no existe
        """
        result = await self.db.execute(
            select(BalanceAccount).where(
                BalanceAccount.code == code,
                BalanceAccount.school_id.is_(None),  # Global account
                BalanceAccount.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def get_account_for_payment_method(
        self,
        payment_method: AccPaymentMethod
    ) -> UUID | None:
        """
        Obtiene el ID de la cuenta global para un método de pago.

        Args:
            payment_method: Método de pago (CASH, TRANSFER, etc.)

        Returns:
            UUID de la cuenta de balance, o None si no aplica (ej: CREDIT)
        """
        account_key = PAYMENT_METHOD_TO_ACCOUNT.get(payment_method)

        if account_key is None:
            return None

        account_code = DEFAULT_ACCOUNTS[account_key]["code"]
        account = await self.get_global_account(account_code)

        if account:
            return account.id

        # Si no existe, crear cuentas globales
        accounts_map = await self.get_or_create_global_accounts()
        return accounts_map.get(account_key)

    async def apply_transaction_to_balance(
        self,
        transaction: Transaction,
        created_by: UUID | None = None
    ) -> BalanceEntry | None:
        """
        Aplica el efecto de una transacción a la cuenta de balance global.

        - INCOME con CASH -> +amount a Caja Global
        - INCOME con TRANSFER -> +amount a Banco Global
        - EXPENSE con CASH -> -amount de Caja Global
        - EXPENSE con TRANSFER -> -amount de Banco Global
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

        # Obtener cuenta global destino
        account_id = await self.get_account_for_payment_method(
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
        # school_id en entry puede ser NULL (global) o el school_id de la transacción
        entry = BalanceEntry(
            account_id=account_id,
            school_id=transaction.school_id,  # Puede ser NULL o UUID (para reportes)
            entry_date=transaction.transaction_date,
            amount=delta,
            balance_after=new_balance,
            description=f"Auto: {transaction.description}",
            reference=transaction.reference_code,
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
            school_id=None,  # Transferencias son globales
            entry_date=transaction.transaction_date,
            amount=-amount,
            balance_after=from_account.balance,
            description=f"Transferencia a {to_account.name}: {transaction.description}",
            reference=transaction.reference_code,
            created_by=created_by
        )
        self.db.add(entry_from)

        # Agregar a cuenta destino
        to_account.balance += amount
        entry_to = BalanceEntry(
            account_id=to_account_id,
            school_id=None,  # Transferencias son globales
            entry_date=transaction.transaction_date,
            amount=amount,
            balance_after=to_account.balance,
            description=f"Transferencia desde {from_account.name}: {transaction.description}",
            reference=transaction.reference_code,
            created_by=created_by
        )
        self.db.add(entry_to)

        # Actualizar transaction
        transaction.balance_account_id = from_account_id
        transaction.transfer_to_account_id = to_account_id

        await self.db.flush()

        return entry_from, entry_to

    async def get_global_cash_balances(self) -> dict:
        """
        Obtiene los saldos actuales globales de Caja y Banco.

        Returns:
            Dict con información de saldos:
            {
                "caja": {"id": UUID, "name": str, "balance": Decimal},
                "banco": {"id": UUID, "name": str, "balance": Decimal},
                "total_liquid": Decimal
            }
        """
        # Obtener/crear cuentas globales
        accounts_map = await self.get_or_create_global_accounts()

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

    # Legacy method for backwards compatibility
    async def get_cash_balances(self, school_id: UUID | None = None) -> dict:
        """
        Obtiene los saldos de Caja y Banco.

        NOTA: school_id se ignora - siempre retorna saldos globales.
        Este método existe por compatibilidad con código existente.

        Args:
            school_id: Ignorado (compatibilidad)

        Returns:
            Dict con saldos globales
        """
        return await self.get_global_cash_balances()

    async def initialize_global_accounts(
        self,
        caja_initial_balance: Decimal = Decimal("0"),
        banco_initial_balance: Decimal = Decimal("0"),
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Inicializa las cuentas globales con saldos iniciales.
        Útil para configuración inicial del sistema.

        Args:
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

            # Buscar cuenta global existente
            result = await self.db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.school_id.is_(None),  # Global
                    BalanceAccount.code == account_config["code"]
                )
            )
            account = result.scalar_one_or_none()

            if account:
                # Actualizar balance si ya existe
                account.balance = initial_balance
            else:
                # Crear nueva cuenta global
                account = BalanceAccount(
                    school_id=None,  # Global
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
                    school_id=None,  # Global entry
                    entry_date=date.today(),
                    amount=initial_balance,
                    balance_after=initial_balance,
                    description="Saldo inicial",
                    created_by=created_by
                )
                self.db.add(entry)

        await self.db.flush()

        return accounts_map

    # Legacy method - redirects to global
    async def get_or_create_default_accounts(
        self,
        school_id: UUID | None = None,
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Legacy method - redirects to get_or_create_global_accounts.

        NOTA: school_id se ignora - siempre usa cuentas globales.
        """
        return await self.get_or_create_global_accounts(created_by)

    # Legacy method - redirects to global
    async def initialize_default_accounts_for_school(
        self,
        school_id: UUID | None = None,
        caja_initial_balance: Decimal = Decimal("0"),
        banco_initial_balance: Decimal = Decimal("0"),
        created_by: UUID | None = None
    ) -> dict[str, UUID]:
        """
        Legacy method - redirects to initialize_global_accounts.

        NOTA: school_id se ignora - siempre usa cuentas globales.
        """
        return await self.initialize_global_accounts(
            caja_initial_balance,
            banco_initial_balance,
            created_by
        )

    async def record_expense_payment(
        self,
        amount: Decimal,
        payment_method: AccPaymentMethod,
        description: str,
        created_by: UUID | None = None
    ) -> BalanceEntry | None:
        """
        Registra el pago de un gasto (reduce Caja o Banco).

        Args:
            amount: Monto del pago
            payment_method: Método de pago (CASH -> Caja, TRANSFER/CARD -> Banco)
            description: Descripción del pago
            created_by: ID del usuario

        Returns:
            BalanceEntry creado, o None si no aplica (ej: CREDIT)
        """
        # CREDIT no afecta cuentas
        if payment_method == AccPaymentMethod.CREDIT:
            return None

        # Obtener cuenta según método de pago
        account_id = await self.get_account_for_payment_method(payment_method)

        if not account_id:
            return None

        # Obtener cuenta
        result = await self.db.execute(
            select(BalanceAccount).where(BalanceAccount.id == account_id)
        )
        account = result.scalar_one_or_none()

        if not account:
            return None

        # Restar del balance (gasto = dinero sale)
        new_balance = account.balance - amount
        account.balance = new_balance

        # Crear BalanceEntry para auditoría
        entry = BalanceEntry(
            account_id=account_id,
            school_id=None,  # Pagos de gastos son globales
            entry_date=date.today(),
            amount=-amount,
            balance_after=new_balance,
            description=description,
            created_by=created_by
        )
        self.db.add(entry)

        await self.db.flush()

        return entry

    async def record_income(
        self,
        amount: Decimal,
        payment_method: AccPaymentMethod,
        description: str,
        school_id: UUID | None = None,
        created_by: UUID | None = None
    ) -> BalanceEntry | None:
        """
        Registra un ingreso (aumenta Caja o Banco).

        Args:
            amount: Monto del ingreso
            payment_method: Método de pago (CASH -> Caja, TRANSFER/CARD -> Banco)
            description: Descripción del ingreso
            school_id: ID del colegio (para reportes, la cuenta es global)
            created_by: ID del usuario

        Returns:
            BalanceEntry creado, o None si no aplica (ej: CREDIT)
        """
        # CREDIT no afecta cuentas
        if payment_method == AccPaymentMethod.CREDIT:
            return None

        # Obtener cuenta según método de pago
        account_id = await self.get_account_for_payment_method(payment_method)

        if not account_id:
            return None

        # Obtener cuenta
        result = await self.db.execute(
            select(BalanceAccount).where(BalanceAccount.id == account_id)
        )
        account = result.scalar_one_or_none()

        if not account:
            return None

        # Sumar al balance (ingreso = dinero entra)
        new_balance = account.balance + amount
        account.balance = new_balance

        # Crear BalanceEntry para auditoría
        entry = BalanceEntry(
            account_id=account_id,
            school_id=school_id,  # Para reportes por colegio
            entry_date=date.today(),
            amount=amount,
            balance_after=new_balance,
            description=description,
            created_by=created_by
        )
        self.db.add(entry)

        await self.db.flush()

        return entry
