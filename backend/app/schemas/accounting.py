"""
Accounting Schemas - Transactions, Expenses, and Cash Flow
"""
from uuid import UUID
from decimal import Decimal
from datetime import datetime, date
from pydantic import Field, field_validator, model_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema
from app.models.accounting import TransactionType, AccPaymentMethod, ExpenseCategory


# ============================================
# Transaction Schemas
# ============================================

class TransactionBase(BaseSchema):
    """Base transaction schema"""
    type: TransactionType
    amount: Decimal = Field(..., gt=0)
    payment_method: AccPaymentMethod
    description: str = Field(..., min_length=1, max_length=500)
    category: str | None = Field(None, max_length=100)
    reference_code: str | None = Field(None, max_length=100)
    transaction_date: date


class TransactionCreate(TransactionBase, SchoolIsolatedSchema):
    """Schema for creating a transaction"""
    sale_id: UUID | None = None
    order_id: UUID | None = None
    expense_id: UUID | None = None


class TransactionUpdate(BaseSchema):
    """Schema for updating a transaction"""
    description: str | None = Field(None, min_length=1, max_length=500)
    category: str | None = Field(None, max_length=100)
    reference_code: str | None = Field(None, max_length=100)


class TransactionInDB(TransactionBase, SchoolIsolatedSchema, IDModelSchema):
    """Transaction as stored in database"""
    sale_id: UUID | None
    order_id: UUID | None
    expense_id: UUID | None
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime


class TransactionResponse(TransactionInDB):
    """Transaction for API responses"""

    model_config = {"from_attributes": True}


class TransactionWithDetails(TransactionResponse):
    """Transaction with related entity details"""
    sale_code: str | None = None
    order_code: str | None = None
    expense_description: str | None = None
    created_by_username: str | None = None


class TransactionListResponse(BaseSchema):
    """Simplified transaction for listings"""
    id: UUID
    type: TransactionType
    amount: Decimal
    payment_method: AccPaymentMethod
    description: str
    category: str | None
    reference_code: str | None
    transaction_date: date
    created_at: datetime


# ============================================
# Expense Schemas
# ============================================

class ExpenseBase(BaseSchema):
    """Base expense schema"""
    category: ExpenseCategory
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal = Field(..., gt=0)
    expense_date: date
    due_date: date | None = None
    vendor: str | None = Field(None, max_length=255)
    receipt_number: str | None = Field(None, max_length=100)
    notes: str | None = None
    is_recurring: bool = False
    recurring_period: str | None = Field(None, pattern=r'^(weekly|monthly|yearly)$')


class ExpenseCreate(ExpenseBase, SchoolIsolatedSchema):
    """Schema for creating an expense"""

    @model_validator(mode='after')
    def validate_recurring(self):
        """Validate recurring_period is set when is_recurring is True"""
        if self.is_recurring and not self.recurring_period:
            raise ValueError("recurring_period is required when is_recurring is True")
        return self


class ExpenseUpdate(BaseSchema):
    """Schema for updating an expense"""
    category: ExpenseCategory | None = None
    description: str | None = Field(None, min_length=1, max_length=500)
    amount: Decimal | None = Field(None, gt=0)
    expense_date: date | None = None
    due_date: date | None = None
    vendor: str | None = Field(None, max_length=255)
    receipt_number: str | None = Field(None, max_length=100)
    notes: str | None = None
    is_recurring: bool | None = None
    recurring_period: str | None = Field(None, pattern=r'^(weekly|monthly|yearly)$')


class ExpensePayment(BaseSchema):
    """Schema for recording expense payment"""
    amount: Decimal = Field(..., gt=0)
    payment_method: AccPaymentMethod
    notes: str | None = None


class ExpenseInDB(ExpenseBase, SchoolIsolatedSchema, IDModelSchema):
    """Expense as stored in database"""
    amount_paid: Decimal
    is_paid: bool
    created_by: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ExpenseResponse(ExpenseInDB):
    """Expense for API responses"""
    balance: Decimal = Field(..., description="Remaining balance to pay")

    model_config = {"from_attributes": True}


class ExpenseWithTransaction(ExpenseResponse):
    """Expense with its payment transaction"""
    transaction: TransactionResponse | None = None
    created_by_username: str | None = None


class ExpenseListResponse(BaseSchema):
    """Simplified expense for listings"""
    id: UUID
    category: ExpenseCategory
    description: str
    amount: Decimal
    amount_paid: Decimal
    is_paid: bool
    expense_date: date
    due_date: date | None
    vendor: str | None
    is_recurring: bool
    balance: Decimal


# ============================================
# Daily Cash Register Schemas
# ============================================

class DailyCashRegisterBase(BaseSchema):
    """Base daily cash register schema"""
    register_date: date
    opening_balance: Decimal = Field(default=Decimal("0"))


class DailyCashRegisterCreate(DailyCashRegisterBase, SchoolIsolatedSchema):
    """Schema for opening a cash register"""
    pass


class DailyCashRegisterClose(BaseSchema):
    """Schema for closing a cash register"""
    closing_balance: Decimal
    notes: str | None = None


class DailyCashRegisterInDB(DailyCashRegisterBase, SchoolIsolatedSchema, IDModelSchema):
    """Daily cash register as stored in database"""
    closing_balance: Decimal | None
    total_income: Decimal
    total_expenses: Decimal
    cash_income: Decimal
    transfer_income: Decimal
    card_income: Decimal
    credit_sales: Decimal
    is_closed: bool
    closed_at: datetime | None
    closed_by: UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class DailyCashRegisterResponse(DailyCashRegisterInDB):
    """Daily cash register for API responses"""
    net_flow: Decimal = Field(..., description="Net cash flow for the day")

    model_config = {"from_attributes": True}


class DailyCashRegisterWithDetails(DailyCashRegisterResponse):
    """Daily cash register with additional details"""
    closed_by_username: str | None = None
    transactions_count: int = 0


# ============================================
# Summary/Analytics Schemas
# ============================================

class CashFlowSummary(BaseSchema):
    """Cash flow summary for a period"""
    period_start: date
    period_end: date
    total_income: Decimal
    total_expenses: Decimal
    net_flow: Decimal
    income_by_method: dict[str, Decimal]  # {"cash": 1000, "transfer": 500}
    expenses_by_category: dict[str, Decimal]  # {"rent": 500, "utilities": 200}


class DailyFinancialSummary(BaseSchema):
    """Daily financial summary"""
    date: date
    sales_count: int
    sales_total: Decimal
    orders_count: int
    orders_total: Decimal
    expenses_count: int
    expenses_total: Decimal
    net_income: Decimal


class MonthlyFinancialReport(BaseSchema):
    """Monthly financial report"""
    year: int
    month: int
    total_income: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    income_breakdown: dict[str, Decimal]
    expense_breakdown: dict[str, Decimal]
    daily_summaries: list[DailyFinancialSummary]


class ExpensesByCategory(BaseSchema):
    """Expenses grouped by category"""
    category: ExpenseCategory
    total_amount: Decimal
    count: int
    percentage: Decimal


class IncomeBySource(BaseSchema):
    """Income grouped by source"""
    source: str  # "sales", "orders", "other"
    total_amount: Decimal
    count: int
    percentage: Decimal


class AccountingDashboard(BaseSchema):
    """Accounting dashboard overview"""
    # Today's numbers
    today_income: Decimal
    today_expenses: Decimal
    today_net: Decimal

    # This month's numbers
    month_income: Decimal
    month_expenses: Decimal
    month_net: Decimal

    # Pending items
    pending_expenses: int
    pending_expenses_amount: Decimal

    # Recent transactions
    recent_transactions: list[TransactionListResponse]
