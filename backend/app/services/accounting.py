"""
Accounting Service - Transactions, Expenses, and Cash Flow Management
"""
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select, func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.accounting import (
    Transaction, TransactionType, AccPaymentMethod,
    Expense, ExpenseCategory,
    DailyCashRegister
)
from app.models.sale import Sale
from app.models.order import Order
from app.schemas.accounting import (
    TransactionCreate, ExpenseCreate, ExpenseUpdate, ExpensePayment,
    DailyCashRegisterCreate, DailyCashRegisterClose,
    CashFlowSummary, DailyFinancialSummary, MonthlyFinancialReport,
    ExpensesByCategory, IncomeBySource, AccountingDashboard
)
from app.services.base import SchoolIsolatedService


class TransactionService(SchoolIsolatedService[Transaction]):
    """Service for Transaction operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Transaction, db)

    async def create_transaction(
        self,
        data: TransactionCreate,
        created_by: UUID | None = None
    ) -> Transaction:
        """Create a new transaction"""
        transaction = Transaction(
            school_id=data.school_id,
            type=data.type,
            amount=data.amount,
            payment_method=data.payment_method,
            description=data.description,
            category=data.category,
            reference_code=data.reference_code,
            transaction_date=data.transaction_date,
            sale_id=data.sale_id,
            order_id=data.order_id,
            expense_id=data.expense_id,
            created_by=created_by
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def create_sale_transaction(
        self,
        sale: Sale,
        payment_method: AccPaymentMethod,
        created_by: UUID | None = None
    ) -> Transaction:
        """Create income transaction from a sale"""
        transaction = Transaction(
            school_id=sale.school_id,
            type=TransactionType.INCOME,
            amount=sale.paid_amount,
            payment_method=payment_method,
            description=f"Venta {sale.code}",
            category="sales",
            reference_code=sale.code,
            transaction_date=sale.sale_date.date(),
            sale_id=sale.id,
            created_by=created_by
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def create_order_transaction(
        self,
        order: Order,
        amount: Decimal,
        payment_method: AccPaymentMethod,
        created_by: UUID | None = None
    ) -> Transaction:
        """Create income transaction from an order payment"""
        transaction = Transaction(
            school_id=order.school_id,
            type=TransactionType.INCOME,
            amount=amount,
            payment_method=payment_method,
            description=f"Abono a encargo {order.code}",
            category="orders",
            reference_code=order.code,
            transaction_date=date.today(),
            order_id=order.id,
            created_by=created_by
        )
        self.db.add(transaction)
        await self.db.flush()
        await self.db.refresh(transaction)
        return transaction

    async def get_transactions_by_date_range(
        self,
        school_id: UUID,
        start_date: date,
        end_date: date,
        transaction_type: TransactionType | None = None
    ) -> list[Transaction]:
        """Get transactions within a date range"""
        query = select(Transaction).where(
            Transaction.school_id == school_id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )

        if transaction_type:
            query = query.where(Transaction.type == transaction_type)

        query = query.order_by(Transaction.transaction_date.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_daily_totals(
        self,
        school_id: UUID,
        target_date: date
    ) -> dict:
        """Get transaction totals for a specific day"""
        result = await self.db.execute(
            select(
                Transaction.type,
                Transaction.payment_method,
                func.sum(Transaction.amount).label('total')
            ).where(
                Transaction.school_id == school_id,
                Transaction.transaction_date == target_date
            ).group_by(Transaction.type, Transaction.payment_method)
        )

        totals = {
            "income": Decimal("0"),
            "expenses": Decimal("0"),
            "cash_income": Decimal("0"),
            "transfer_income": Decimal("0"),
            "card_income": Decimal("0"),
            "credit_sales": Decimal("0")
        }

        for row in result:
            if row.type == TransactionType.INCOME:
                totals["income"] += row.total
                if row.payment_method == AccPaymentMethod.CASH:
                    totals["cash_income"] += row.total
                elif row.payment_method == AccPaymentMethod.TRANSFER:
                    totals["transfer_income"] += row.total
                elif row.payment_method == AccPaymentMethod.CARD:
                    totals["card_income"] += row.total
                elif row.payment_method == AccPaymentMethod.CREDIT:
                    totals["credit_sales"] += row.total
            elif row.type == TransactionType.EXPENSE:
                totals["expenses"] += row.total

        return totals


class ExpenseService(SchoolIsolatedService[Expense]):
    """Service for Expense operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Expense, db)
        self.transaction_service = TransactionService(db)

    async def create_expense(
        self,
        data: ExpenseCreate,
        created_by: UUID | None = None
    ) -> Expense:
        """Create a new expense"""
        expense = Expense(
            school_id=data.school_id,
            category=data.category,
            description=data.description,
            amount=data.amount,
            expense_date=data.expense_date,
            due_date=data.due_date,
            vendor=data.vendor,
            receipt_number=data.receipt_number,
            notes=data.notes,
            is_recurring=data.is_recurring,
            recurring_period=data.recurring_period,
            created_by=created_by
        )
        self.db.add(expense)
        await self.db.flush()
        await self.db.refresh(expense)
        return expense

    async def update_expense(
        self,
        expense_id: UUID,
        school_id: UUID,
        data: ExpenseUpdate
    ) -> Expense | None:
        """Update an expense"""
        return await self.update(
            expense_id,
            school_id,
            data.model_dump(exclude_unset=True)
        )

    async def pay_expense(
        self,
        expense_id: UUID,
        school_id: UUID,
        payment: ExpensePayment,
        created_by: UUID | None = None
    ) -> Expense | None:
        """Record a payment for an expense"""
        expense = await self.get(expense_id, school_id)
        if not expense:
            return None

        # Calculate new paid amount
        new_paid = expense.amount_paid + payment.amount
        if new_paid > expense.amount:
            raise ValueError("El pago excede el monto pendiente")

        # Update expense
        expense.amount_paid = new_paid
        expense.is_paid = (new_paid >= expense.amount)

        await self.db.flush()

        # Create expense transaction
        transaction = Transaction(
            school_id=school_id,
            type=TransactionType.EXPENSE,
            amount=payment.amount,
            payment_method=payment.payment_method,
            description=f"Pago: {expense.description}",
            category=expense.category.value,
            transaction_date=date.today(),
            expense_id=expense.id,
            created_by=created_by
        )
        self.db.add(transaction)
        await self.db.flush()

        await self.db.refresh(expense)
        return expense

    async def get_pending_expenses(
        self,
        school_id: UUID
    ) -> list[Expense]:
        """Get all unpaid expenses"""
        result = await self.db.execute(
            select(Expense).where(
                Expense.school_id == school_id,
                Expense.is_paid == False,
                Expense.is_active == True
            ).order_by(Expense.due_date.asc().nullslast())
        )
        return list(result.scalars().all())

    async def get_expenses_by_category(
        self,
        school_id: UUID,
        start_date: date,
        end_date: date
    ) -> list[ExpensesByCategory]:
        """Get expenses grouped by category for a date range"""
        result = await self.db.execute(
            select(
                Expense.category,
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).where(
                Expense.school_id == school_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
                Expense.is_active == True
            ).group_by(Expense.category)
        )

        total_sum = Decimal("0")
        categories = []
        for row in result:
            categories.append({
                "category": row.category,
                "total_amount": row.total,
                "count": row.count
            })
            total_sum += row.total

        # Calculate percentages
        return [
            ExpensesByCategory(
                category=c["category"],
                total_amount=c["total_amount"],
                count=c["count"],
                percentage=(c["total_amount"] / total_sum * 100) if total_sum > 0 else Decimal("0")
            )
            for c in categories
        ]


class DailyCashRegisterService(SchoolIsolatedService[DailyCashRegister]):
    """Service for Daily Cash Register operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(DailyCashRegister, db)
        self.transaction_service = TransactionService(db)

    async def open_register(
        self,
        data: DailyCashRegisterCreate
    ) -> DailyCashRegister:
        """Open a new daily cash register"""
        # Check if register already exists for this date
        existing = await self.db.execute(
            select(DailyCashRegister).where(
                DailyCashRegister.school_id == data.school_id,
                DailyCashRegister.register_date == data.register_date
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Ya existe una caja para el {data.register_date}")

        register = DailyCashRegister(
            school_id=data.school_id,
            register_date=data.register_date,
            opening_balance=data.opening_balance
        )
        self.db.add(register)
        await self.db.flush()
        await self.db.refresh(register)
        return register

    async def close_register(
        self,
        register_id: UUID,
        school_id: UUID,
        data: DailyCashRegisterClose,
        closed_by: UUID
    ) -> DailyCashRegister | None:
        """Close a daily cash register"""
        register = await self.get(register_id, school_id)
        if not register:
            return None

        if register.is_closed:
            raise ValueError("La caja ya está cerrada")

        # Get daily totals from transactions
        daily_totals = await self.transaction_service.get_daily_totals(
            school_id,
            register.register_date
        )

        # Update register with calculated totals
        register.closing_balance = data.closing_balance
        register.total_income = daily_totals["income"]
        register.total_expenses = daily_totals["expenses"]
        register.cash_income = daily_totals["cash_income"]
        register.transfer_income = daily_totals["transfer_income"]
        register.card_income = daily_totals["card_income"]
        register.credit_sales = daily_totals["credit_sales"]
        register.is_closed = True
        register.closed_at = datetime.utcnow()
        register.closed_by = closed_by
        register.notes = data.notes

        await self.db.flush()
        await self.db.refresh(register)
        return register

    async def get_or_create_today(
        self,
        school_id: UUID,
        opening_balance: Decimal = Decimal("0")
    ) -> DailyCashRegister:
        """Get today's register or create one if it doesn't exist"""
        today = date.today()

        result = await self.db.execute(
            select(DailyCashRegister).where(
                DailyCashRegister.school_id == school_id,
                DailyCashRegister.register_date == today
            )
        )
        register = result.scalar_one_or_none()

        if not register:
            register = DailyCashRegister(
                school_id=school_id,
                register_date=today,
                opening_balance=opening_balance
            )
            self.db.add(register)
            await self.db.flush()
            await self.db.refresh(register)

        return register

    async def get_register_by_date(
        self,
        school_id: UUID,
        register_date: date
    ) -> DailyCashRegister | None:
        """Get register for a specific date"""
        result = await self.db.execute(
            select(DailyCashRegister).where(
                DailyCashRegister.school_id == school_id,
                DailyCashRegister.register_date == register_date
            )
        )
        return result.scalar_one_or_none()


class AccountingService:
    """High-level accounting service for reports and dashboards"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.transaction_service = TransactionService(db)
        self.expense_service = ExpenseService(db)
        self.register_service = DailyCashRegisterService(db)

    async def get_dashboard(self, school_id: UUID) -> AccountingDashboard:
        """Get accounting dashboard overview"""
        today = date.today()
        month_start = today.replace(day=1)

        # Today's numbers
        today_totals = await self.transaction_service.get_daily_totals(school_id, today)

        # Month's numbers
        month_income = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.school_id == school_id,
                Transaction.type == TransactionType.INCOME,
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date <= today
            )
        )
        month_income = Decimal(str(month_income.scalar_one()))

        month_expenses = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.school_id == school_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= month_start,
                Transaction.transaction_date <= today
            )
        )
        month_expenses = Decimal(str(month_expenses.scalar_one()))

        # Pending expenses
        pending = await self.expense_service.get_pending_expenses(school_id)
        pending_amount = sum(e.balance for e in pending)

        # Recent transactions
        recent = await self.transaction_service.get_transactions_by_date_range(
            school_id,
            today.replace(day=1),
            today
        )

        from app.schemas.accounting import TransactionListResponse

        return AccountingDashboard(
            today_income=today_totals["income"],
            today_expenses=today_totals["expenses"],
            today_net=today_totals["income"] - today_totals["expenses"],
            month_income=month_income,
            month_expenses=month_expenses,
            month_net=month_income - month_expenses,
            pending_expenses=len(pending),
            pending_expenses_amount=pending_amount,
            recent_transactions=[
                TransactionListResponse(
                    id=t.id,
                    type=t.type,
                    amount=t.amount,
                    payment_method=t.payment_method,
                    description=t.description,
                    category=t.category,
                    reference_code=t.reference_code,
                    transaction_date=t.transaction_date,
                    created_at=t.created_at
                )
                for t in recent[:10]
            ]
        )

    async def get_cash_flow_summary(
        self,
        school_id: UUID,
        start_date: date,
        end_date: date
    ) -> CashFlowSummary:
        """Get cash flow summary for a period"""
        # Get income by payment method
        income_result = await self.db.execute(
            select(
                Transaction.payment_method,
                func.sum(Transaction.amount).label('total')
            ).where(
                Transaction.school_id == school_id,
                Transaction.type == TransactionType.INCOME,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            ).group_by(Transaction.payment_method)
        )

        income_by_method = {}
        total_income = Decimal("0")
        for row in income_result:
            income_by_method[row.payment_method.value] = row.total
            total_income += row.total

        # Get expenses by category
        expenses_result = await self.db.execute(
            select(
                Transaction.category,
                func.sum(Transaction.amount).label('total')
            ).where(
                Transaction.school_id == school_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            ).group_by(Transaction.category)
        )

        expenses_by_category = {}
        total_expenses = Decimal("0")
        for row in expenses_result:
            if row.category:
                expenses_by_category[row.category] = row.total
                total_expenses += row.total

        return CashFlowSummary(
            period_start=start_date,
            period_end=end_date,
            total_income=total_income,
            total_expenses=total_expenses,
            net_flow=total_income - total_expenses,
            income_by_method=income_by_method,
            expenses_by_category=expenses_by_category
        )

    async def get_monthly_report(
        self,
        school_id: UUID,
        year: int,
        month: int
    ) -> MonthlyFinancialReport:
        """Get monthly financial report"""
        from calendar import monthrange

        _, last_day = monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        cash_flow = await self.get_cash_flow_summary(school_id, start_date, end_date)

        # Get daily summaries
        daily_result = await self.db.execute(
            select(
                Transaction.transaction_date,
                Transaction.type,
                func.sum(Transaction.amount).label('total'),
                func.count(Transaction.id).label('count')
            ).where(
                Transaction.school_id == school_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            ).group_by(Transaction.transaction_date, Transaction.type)
            .order_by(Transaction.transaction_date)
        )

        daily_data = {}
        for row in daily_result:
            dt = row.transaction_date
            if dt not in daily_data:
                daily_data[dt] = {
                    "date": dt,
                    "sales_count": 0,
                    "sales_total": Decimal("0"),
                    "orders_count": 0,
                    "orders_total": Decimal("0"),
                    "expenses_count": 0,
                    "expenses_total": Decimal("0")
                }

            if row.type == TransactionType.INCOME:
                daily_data[dt]["sales_count"] += row.count
                daily_data[dt]["sales_total"] += row.total
            elif row.type == TransactionType.EXPENSE:
                daily_data[dt]["expenses_count"] += row.count
                daily_data[dt]["expenses_total"] += row.total

        daily_summaries = [
            DailyFinancialSummary(
                **d,
                net_income=d["sales_total"] + d["orders_total"] - d["expenses_total"]
            )
            for d in daily_data.values()
        ]

        return MonthlyFinancialReport(
            year=year,
            month=month,
            total_income=cash_flow.total_income,
            total_expenses=cash_flow.total_expenses,
            net_profit=cash_flow.net_flow,
            income_breakdown=cash_flow.income_by_method,
            expense_breakdown=cash_flow.expenses_by_category,
            daily_summaries=daily_summaries
        )
