"""
Accounting Endpoints - Transactions, Expenses, and Cash Flow
"""
from uuid import UUID
from datetime import date
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.models.accounting import TransactionType, ExpenseCategory
from app.schemas.accounting import (
    TransactionCreate, TransactionResponse, TransactionListResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse, ExpensePayment,
    DailyCashRegisterCreate, DailyCashRegisterClose, DailyCashRegisterResponse,
    CashFlowSummary, MonthlyFinancialReport, AccountingDashboard, ExpensesByCategory
)
from app.services.accounting import (
    TransactionService, ExpenseService, DailyCashRegisterService, AccountingService
)


router = APIRouter(prefix="/schools/{school_id}/accounting", tags=["Accounting"])


# ============================================
# Dashboard & Reports
# ============================================

@router.get(
    "/dashboard",
    response_model=AccountingDashboard,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_accounting_dashboard(
    school_id: UUID,
    db: DatabaseSession
):
    """
    Get accounting dashboard overview (requires ADMIN role)

    Shows:
    - Today's income/expenses/net
    - Month's income/expenses/net
    - Pending expenses count and amount
    - Recent transactions
    """
    service = AccountingService(db)
    return await service.get_dashboard(school_id)


@router.get(
    "/cash-flow",
    response_model=CashFlowSummary,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_cash_flow_summary(
    school_id: UUID,
    db: DatabaseSession,
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date")
):
    """
    Get cash flow summary for a date range (requires ADMIN role)
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )

    service = AccountingService(db)
    return await service.get_cash_flow_summary(school_id, start_date, end_date)


@router.get(
    "/monthly-report/{year}/{month}",
    response_model=MonthlyFinancialReport,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_monthly_report(
    school_id: UUID,
    year: int,
    month: int,
    db: DatabaseSession
):
    """
    Get monthly financial report (requires ADMIN role)
    """
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )

    service = AccountingService(db)
    return await service.get_monthly_report(school_id, year, month)


# ============================================
# Transactions
# ============================================

@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def create_transaction(
    school_id: UUID,
    transaction_data: TransactionCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a manual transaction (requires ADMIN role)

    Note: Sales and order payments automatically create transactions.
    Use this for manual income/expense entries.
    """
    transaction_data.school_id = school_id

    service = TransactionService(db)

    try:
        transaction = await service.create_transaction(
            transaction_data,
            created_by=current_user.id
        )
        await db.commit()
        return TransactionResponse.model_validate(transaction)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/transactions",
    response_model=list[TransactionListResponse],
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def list_transactions(
    school_id: UUID,
    db: DatabaseSession,
    start_date: date = Query(None, description="Filter by start date"),
    end_date: date = Query(None, description="Filter by end date"),
    transaction_type: TransactionType = Query(None, description="Filter by type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List transactions with optional filters (requires ADMIN role)
    """
    service = TransactionService(db)

    if start_date and end_date:
        transactions = await service.get_transactions_by_date_range(
            school_id, start_date, end_date, transaction_type
        )
        # Apply pagination manually
        transactions = transactions[skip:skip + limit]
    else:
        filters = {}
        if transaction_type:
            filters["type"] = transaction_type
        transactions = await service.get_multi(
            school_id=school_id,
            skip=skip,
            limit=limit,
            filters=filters if filters else None
        )

    return [TransactionListResponse.model_validate(t) for t in transactions]


@router.get(
    "/transactions/{transaction_id}",
    response_model=TransactionResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_transaction(
    school_id: UUID,
    transaction_id: UUID,
    db: DatabaseSession
):
    """Get transaction by ID (requires ADMIN role)"""
    service = TransactionService(db)
    transaction = await service.get(transaction_id, school_id)

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return TransactionResponse.model_validate(transaction)


# ============================================
# Expenses
# ============================================

@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def create_expense(
    school_id: UUID,
    expense_data: ExpenseCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a new expense record (requires ADMIN role)
    """
    expense_data.school_id = school_id

    service = ExpenseService(db)

    try:
        expense = await service.create_expense(
            expense_data,
            created_by=current_user.id
        )
        await db.commit()
        return ExpenseResponse.model_validate(expense)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/expenses",
    response_model=list[ExpenseListResponse],
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def list_expenses(
    school_id: UUID,
    db: DatabaseSession,
    category: ExpenseCategory = Query(None, description="Filter by category"),
    is_paid: bool = Query(None, description="Filter by payment status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List expenses with optional filters (requires ADMIN role)
    """
    service = ExpenseService(db)

    filters = {"is_active": True}
    if category:
        filters["category"] = category
    if is_paid is not None:
        filters["is_paid"] = is_paid

    expenses = await service.get_multi(
        school_id=school_id,
        skip=skip,
        limit=limit,
        filters=filters
    )

    return [
        ExpenseListResponse(
            id=e.id,
            category=e.category,
            description=e.description,
            amount=e.amount,
            amount_paid=e.amount_paid,
            is_paid=e.is_paid,
            expense_date=e.expense_date,
            due_date=e.due_date,
            vendor=e.vendor,
            is_recurring=e.is_recurring,
            balance=e.balance
        )
        for e in expenses
    ]


@router.get(
    "/expenses/pending",
    response_model=list[ExpenseListResponse],
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_pending_expenses(
    school_id: UUID,
    db: DatabaseSession
):
    """
    Get all pending (unpaid) expenses (requires ADMIN role)
    """
    service = ExpenseService(db)
    expenses = await service.get_pending_expenses(school_id)

    return [
        ExpenseListResponse(
            id=e.id,
            category=e.category,
            description=e.description,
            amount=e.amount,
            amount_paid=e.amount_paid,
            is_paid=e.is_paid,
            expense_date=e.expense_date,
            due_date=e.due_date,
            vendor=e.vendor,
            is_recurring=e.is_recurring,
            balance=e.balance
        )
        for e in expenses
    ]


@router.get(
    "/expenses/by-category",
    response_model=list[ExpensesByCategory],
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_expenses_by_category(
    school_id: UUID,
    db: DatabaseSession,
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date")
):
    """
    Get expenses grouped by category for a date range (requires ADMIN role)
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )

    service = ExpenseService(db)
    return await service.get_expenses_by_category(school_id, start_date, end_date)


@router.get(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_expense(
    school_id: UUID,
    expense_id: UUID,
    db: DatabaseSession
):
    """Get expense by ID (requires ADMIN role)"""
    service = ExpenseService(db)
    expense = await service.get(expense_id, school_id)

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    return ExpenseResponse.model_validate(expense)


@router.patch(
    "/expenses/{expense_id}",
    response_model=ExpenseResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def update_expense(
    school_id: UUID,
    expense_id: UUID,
    expense_data: ExpenseUpdate,
    db: DatabaseSession
):
    """Update an expense (requires ADMIN role)"""
    service = ExpenseService(db)

    try:
        expense = await service.update_expense(expense_id, school_id, expense_data)

        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        await db.commit()
        return ExpenseResponse.model_validate(expense)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/expenses/{expense_id}/pay",
    response_model=ExpenseResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def pay_expense(
    school_id: UUID,
    expense_id: UUID,
    payment: ExpensePayment,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Record a payment for an expense (requires ADMIN role)

    Creates an expense transaction automatically.
    """
    service = ExpenseService(db)

    try:
        expense = await service.pay_expense(
            expense_id,
            school_id,
            payment,
            created_by=current_user.id
        )

        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        await db.commit()
        return ExpenseResponse.model_validate(expense)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete(
    "/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_school_access(UserRole.OWNER))]
)
async def delete_expense(
    school_id: UUID,
    expense_id: UUID,
    db: DatabaseSession
):
    """Soft delete an expense (requires OWNER role)"""
    service = ExpenseService(db)

    expense = await service.soft_delete(expense_id, school_id)

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    await db.commit()


# ============================================
# Daily Cash Register
# ============================================

@router.post(
    "/cash-register",
    response_model=DailyCashRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def open_cash_register(
    school_id: UUID,
    register_data: DailyCashRegisterCreate,
    db: DatabaseSession
):
    """
    Open a new daily cash register (requires ADMIN role)
    """
    register_data.school_id = school_id

    service = DailyCashRegisterService(db)

    try:
        register = await service.open_register(register_data)
        await db.commit()
        return DailyCashRegisterResponse.model_validate(register)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/cash-register/today",
    response_model=DailyCashRegisterResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def get_today_register(
    school_id: UUID,
    db: DatabaseSession
):
    """
    Get or create today's cash register (requires SELLER role)
    """
    service = DailyCashRegisterService(db)
    register = await service.get_or_create_today(school_id)
    await db.commit()
    return DailyCashRegisterResponse.model_validate(register)


@router.get(
    "/cash-register/{register_date}",
    response_model=DailyCashRegisterResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def get_register_by_date(
    school_id: UUID,
    register_date: date,
    db: DatabaseSession
):
    """
    Get cash register for a specific date (requires ADMIN role)
    """
    service = DailyCashRegisterService(db)
    register = await service.get_register_by_date(school_id, register_date)

    if not register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No register found for {register_date}"
        )

    return DailyCashRegisterResponse.model_validate(register)


@router.post(
    "/cash-register/{register_id}/close",
    response_model=DailyCashRegisterResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def close_cash_register(
    school_id: UUID,
    register_id: UUID,
    close_data: DailyCashRegisterClose,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Close a cash register (requires ADMIN role)

    Automatically calculates:
    - Total income by payment method
    - Total expenses
    - Net cash flow
    """
    service = DailyCashRegisterService(db)

    try:
        register = await service.close_register(
            register_id,
            school_id,
            close_data,
            closed_by=current_user.id
        )

        if not register:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cash register not found"
            )

        await db.commit()
        return DailyCashRegisterResponse.model_validate(register)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
