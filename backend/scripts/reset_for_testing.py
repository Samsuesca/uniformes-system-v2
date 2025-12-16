"""
Script para resetear la base de datos para pruebas.

Este script:
1. Elimina todas las ventas, encargos y transacciones
2. Resetea los balances de Caja y Banco a 0
3. Elimina gastos, CxC y CxP
4. Mantiene: colegios, productos, inventario, usuarios

Uso:
    cd backend
    source venv/bin/activate
    python -m scripts.reset_for_testing
"""
import asyncio
from decimal import Decimal
from datetime import date

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.accounting import (
    BalanceAccount, BalanceEntry, Transaction, Expense,
    AccountsReceivable, AccountsPayable, DailyCashRegister
)


async def reset_database():
    """Resetea la base de datos para pruebas."""

    # Crear conexión
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            print("\n" + "="*60)
            print("🔄 INICIANDO RESET DE BASE DE DATOS PARA PRUEBAS")
            print("="*60 + "\n")

            # 1. Eliminar sale_items y sale_changes primero (dependencias)
            print("📦 Eliminando items de ventas...")
            await db.execute(text("DELETE FROM sale_items"))
            await db.execute(text("DELETE FROM sale_changes"))

            # 2. Eliminar ventas
            print("🛒 Eliminando ventas...")
            await db.execute(text("DELETE FROM sales"))

            # 3. Eliminar order_items y orders
            print("📋 Eliminando items de encargos...")
            await db.execute(text("DELETE FROM order_items"))

            print("📋 Eliminando encargos...")
            await db.execute(text("DELETE FROM orders"))

            # 4. Eliminar transacciones contables
            print("💳 Eliminando transacciones...")
            await db.execute(text("DELETE FROM transactions"))

            # 5. Eliminar gastos
            print("💸 Eliminando gastos...")
            await db.execute(text("DELETE FROM expenses"))

            # 6. Eliminar cuentas por cobrar
            print("📥 Eliminando cuentas por cobrar...")
            await db.execute(text("DELETE FROM accounts_receivable"))

            # 7. Eliminar cuentas por pagar
            print("📤 Eliminando cuentas por pagar...")
            await db.execute(text("DELETE FROM accounts_payable"))

            # 8. Eliminar entradas de balance (historial)
            print("📊 Eliminando historial de balances...")
            await db.execute(text("DELETE FROM balance_entries"))

            # 9. Eliminar registros de caja diaria
            print("💰 Eliminando registros de caja diaria...")
            await db.execute(text("DELETE FROM daily_cash_registers"))

            # 10. Resetear balances de Caja y Banco a 0
            print("🏦 Reseteando Caja y Banco a $0...")

            # Obtener cuentas globales (Caja y Banco)
            result = await db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.school_id.is_(None),
                    BalanceAccount.code.in_(['1101', '1102'])
                )
            )
            global_accounts = result.scalars().all()

            for account in global_accounts:
                old_balance = account.balance
                account.balance = Decimal("0")
                print(f"   - {account.name}: ${old_balance} → $0")

                # Crear entrada de reset
                entry = BalanceEntry(
                    account_id=account.id,
                    school_id=None,
                    entry_date=date.today(),
                    amount=-old_balance,
                    balance_after=Decimal("0"),
                    description="Reset para pruebas",
                    reference="RESET"
                )
                db.add(entry)

            # 11. Eliminar cuentas de balance específicas de colegios (activos fijos, deudas, etc.)
            # Pero mantener las cuentas globales
            print("🏛️ Eliminando cuentas de balance por colegio...")
            await db.execute(
                text("DELETE FROM balance_accounts WHERE school_id IS NOT NULL")
            )

            # Commit de todos los cambios
            await db.commit()

            print("\n" + "="*60)
            print("✅ RESET COMPLETADO EXITOSAMENTE")
            print("="*60)
            print("\nEstado actual:")
            print("  - Ventas: 0")
            print("  - Encargos: 0")
            print("  - Transacciones: 0")
            print("  - Gastos: 0")
            print("  - CxC: 0")
            print("  - CxP: 0")
            print("  - Caja: $0")
            print("  - Banco: $0")
            print("\nSe mantienen:")
            print("  - Colegios")
            print("  - Productos e inventario")
            print("  - Usuarios")
            print("  - Clientes")
            print("\n")

        except Exception as e:
            await db.rollback()
            print(f"\n❌ ERROR: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset_database())
