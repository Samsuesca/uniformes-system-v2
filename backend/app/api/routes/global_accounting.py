"""
Global Accounting Endpoints - Business-wide accounting operations

These endpoints operate on global accounts (school_id = NULL) for:
- Cash (Caja) and Bank (Banco) balances
- Business expenses
- Accounts payable (suppliers)
- Balance general

For school-specific reports, use /schools/{school_id}/accounting/* endpoints.
"""
from uuid import UUID
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_any_school_admin
from app.models.user import UserRole
from app.models.accounting import (
    TransactionType, ExpenseCategory, AccountType,
    BalanceAccount, BalanceEntry, Expense, AccountsPayable, AccountsReceivable, Transaction
)
from app.models.school import School
from app.schemas.accounting import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse, ExpensePayment,
    GlobalExpenseCreate, GlobalExpenseResponse,
    BalanceAccountResponse, BalanceAccountListResponse, BalanceAccountUpdate,
    GlobalBalanceAccountCreate, GlobalBalanceAccountResponse,
    GlobalAccountsPayableCreate, GlobalAccountsPayableResponse, AccountsPayableListResponse, AccountsPayablePayment,
    GlobalAccountsReceivableCreate, GlobalAccountsReceivableResponse, AccountsReceivableListResponse, AccountsReceivablePayment,
    BalanceGeneralSummary, BalanceGeneralDetailed,
    TransactionListItemResponse, ExpenseCategorySummary, CashFlowPeriodItem, CashFlowReportResponse
)
from sqlalchemy import select, func

router = APIRouter(prefix="/global/accounting", tags=["Global Accounting"])


# ============================================
# Global Cash Balances (Caja y Banco)
# ============================================

@router.get(
    "/cash-balances",
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_cash_balances(
    db: DatabaseSession
):
    """
    Get global cash and bank balances (business-wide)

    Returns:
        - caja: Current cash balance
        - banco: Current bank account balance
        - total_liquid: Sum of both
    """
    from app.services.balance_integration import BalanceIntegrationService

    service = BalanceIntegrationService(db)
    balances = await service.get_global_cash_balances()

    return balances


@router.post(
    "/initialize-accounts",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_school_admin)]
)
async def initialize_global_accounts(
    db: DatabaseSession,
    current_user: CurrentUser,
    caja_initial_balance: float = 0,
    banco_initial_balance: float = 0
):
    """
    Initialize global balance accounts (Caja, Banco) for the business

    This creates global accounts with school_id = NULL.
    If accounts already exist, they won't be duplicated.

    Args:
        caja_initial_balance: Initial cash balance (default 0)
        banco_initial_balance: Initial bank balance (default 0)

    Returns:
        Mapping of account types to UUIDs
    """
    from app.services.balance_integration import BalanceIntegrationService

    service = BalanceIntegrationService(db)

    try:
        accounts_map = await service.get_or_create_global_accounts(
            created_by=current_user.id
        )

        # Set initial balances if provided
        if caja_initial_balance > 0 or banco_initial_balance > 0:
            # Get and update caja
            result = await db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.id == accounts_map["caja"]
                )
            )
            caja = result.scalar_one_or_none()
            if caja and caja_initial_balance > 0:
                caja.balance = Decimal(str(caja_initial_balance))

            # Get and update banco
            result = await db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.id == accounts_map["banco"]
                )
            )
            banco = result.scalar_one_or_none()
            if banco and banco_initial_balance > 0:
                banco.balance = Decimal(str(banco_initial_balance))

        await db.commit()

        return {
            "message": "Global accounts initialized successfully",
            "accounts": {k: str(v) for k, v in accounts_map.items()}
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post(
    "/set-balance",
    dependencies=[Depends(require_any_school_admin)]
)
async def set_global_account_balance(
    account_code: str,  # "1101" for Caja, "1102" for Banco
    new_balance: float,
    db: DatabaseSession,
    current_user: CurrentUser,
    description: str = "Ajuste de balance inicial"
):
    """
    Set balance for a global account (Caja or Banco)

    Use this to set initial balances or make adjustments.
    Creates an audit entry in the balance history.

    Args:
        account_code: "1101" for Caja, "1102" for Banco
        new_balance: The new balance amount
        description: Reason for the adjustment
    """
    # Get global account
    result = await db.execute(
        select(BalanceAccount).where(
            BalanceAccount.school_id.is_(None),
            BalanceAccount.code == account_code,
            BalanceAccount.is_active == True
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Global account with code '{account_code}' not found. Initialize accounts first."
        )

    old_balance = account.balance
    adjustment = Decimal(str(new_balance)) - old_balance

    # Create balance entry for audit
    entry = BalanceEntry(
        school_id=None,  # Global
        account_id=account.id,
        entry_date=date.today(),
        amount=adjustment,
        balance_after=Decimal(str(new_balance)),
        description=f"{description} (de ${old_balance} a ${new_balance})",
        reference="AJUSTE",
        created_by=current_user.id
    )
    db.add(entry)

    # Update balance
    account.balance = Decimal(str(new_balance))

    await db.commit()

    return {
        "message": f"Balance actualizado para {account.name}",
        "account_id": str(account.id),
        "account_name": account.name,
        "old_balance": float(old_balance),
        "new_balance": float(account.balance),
        "adjustment": float(adjustment)
    }


# ============================================
# Global Balance Accounts
# ============================================

@router.get(
    "/balance-accounts",
    response_model=list[BalanceAccountListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_balance_accounts(
    db: DatabaseSession,
    account_type: AccountType = Query(None, description="Filter by account type"),
    is_active: bool = Query(True, description="Filter by active status")
):
    """
    List global balance accounts (school_id = NULL)
    """
    query = select(BalanceAccount).where(
        BalanceAccount.school_id.is_(None)
    )

    if account_type:
        query = query.where(BalanceAccount.account_type == account_type)
    if is_active is not None:
        query = query.where(BalanceAccount.is_active == is_active)

    query = query.order_by(BalanceAccount.code)
    result = await db.execute(query)
    accounts = result.scalars().all()

    return [
        BalanceAccountListResponse(
            id=a.id,
            account_type=a.account_type,
            name=a.name,
            code=a.code,
            balance=a.balance,
            net_value=a.net_value,
            is_active=a.is_active
        )
        for a in accounts
    ]


@router.get(
    "/balance-accounts/{account_id}",
    response_model=GlobalBalanceAccountResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_balance_account(
    account_id: UUID,
    db: DatabaseSession
):
    """Get global balance account by ID"""
    result = await db.execute(
        select(BalanceAccount).where(
            BalanceAccount.id == account_id,
            BalanceAccount.school_id.is_(None)
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global balance account not found"
        )

    return GlobalBalanceAccountResponse.model_validate(account)


@router.post(
    "/balance-accounts",
    response_model=GlobalBalanceAccountResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_school_admin)]
)
async def create_global_balance_account(
    account_data: GlobalBalanceAccountCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a global balance account (business-wide)

    Use this to create:
    - Fixed assets (ASSET_FIXED): machinery, vehicles, equipment
    - Current liabilities (LIABILITY_CURRENT): short-term debts
    - Long-term liabilities (LIABILITY_LONG): loans, mortgages
    - Other account types as needed
    """
    # Generate a code if not provided
    code = account_data.code
    if not code:
        # Generate code based on account type
        type_prefix = {
            AccountType.ASSET_CURRENT: "11",
            AccountType.ASSET_FIXED: "12",
            AccountType.ASSET_OTHER: "19",
            AccountType.LIABILITY_CURRENT: "21",
            AccountType.LIABILITY_LONG: "22",
            AccountType.LIABILITY_OTHER: "29",
            AccountType.EQUITY_CAPITAL: "31",
            AccountType.EQUITY_RETAINED: "32",
            AccountType.EQUITY_OTHER: "39",
        }
        prefix = type_prefix.get(account_data.account_type, "90")

        # Count existing accounts of this type
        result = await db.execute(
            select(func.count(BalanceAccount.id)).where(
                BalanceAccount.school_id.is_(None),
                BalanceAccount.code.like(f"{prefix}%")
            )
        )
        count = result.scalar() or 0
        code = f"{prefix}{str(count + 1).zfill(2)}"

    account = BalanceAccount(
        school_id=None,  # Global account
        account_type=account_data.account_type,
        name=account_data.name,
        description=account_data.description,
        code=code,
        balance=account_data.balance,
        original_value=account_data.original_value,
        accumulated_depreciation=account_data.accumulated_depreciation,
        useful_life_years=account_data.useful_life_years,
        interest_rate=account_data.interest_rate,
        due_date=account_data.due_date,
        creditor=account_data.creditor,
        created_by=current_user.id
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)

    return GlobalBalanceAccountResponse.model_validate(account)


@router.patch(
    "/balance-accounts/{account_id}",
    response_model=GlobalBalanceAccountResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def update_global_balance_account(
    account_id: UUID,
    account_data: BalanceAccountUpdate,
    db: DatabaseSession
):
    """Update a global balance account"""
    result = await db.execute(
        select(BalanceAccount).where(
            BalanceAccount.id == account_id,
            BalanceAccount.school_id.is_(None)
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global balance account not found"
        )

    # Update fields
    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)

    return GlobalBalanceAccountResponse.model_validate(account)


@router.delete(
    "/balance-accounts/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_any_school_admin)]
)
async def delete_global_balance_account(
    account_id: UUID,
    db: DatabaseSession
):
    """
    Soft delete a global balance account (mark as inactive)

    Note: Cannot delete Caja (1101) or Banco (1102) accounts.
    """
    result = await db.execute(
        select(BalanceAccount).where(
            BalanceAccount.id == account_id,
            BalanceAccount.school_id.is_(None)
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global balance account not found"
        )

    # Prevent deletion of Caja and Banco
    if account.code in ("1101", "1102"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la cuenta de Caja o Banco"
        )

    account.is_active = False
    await db.commit()

    return None


@router.get(
    "/balance-accounts/{account_id}/entries",
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_balance_entries(
    account_id: UUID,
    db: DatabaseSession,
    limit: int = Query(50, ge=1, le=200)
):
    """
    List recent entries for a global balance account
    """
    # Verify account exists and is global
    result = await db.execute(
        select(BalanceAccount).where(
            BalanceAccount.id == account_id,
            BalanceAccount.school_id.is_(None)
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global balance account not found"
        )

    # Get entries
    result = await db.execute(
        select(BalanceEntry)
        .where(BalanceEntry.account_id == account_id)
        .order_by(BalanceEntry.created_at.desc())
        .limit(limit)
    )
    entries = result.scalars().all()

    return [
        {
            "id": str(e.id),
            "entry_date": e.entry_date.isoformat(),
            "amount": float(e.amount),
            "balance_after": float(e.balance_after),
            "description": e.description,
            "reference": e.reference,
            "created_at": e.created_at.isoformat()
        }
        for e in entries
    ]


# ============================================
# Global Balance General Summary
# ============================================

@router.get(
    "/balance-general/summary",
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_balance_general_summary(
    db: DatabaseSession
):
    """
    Get global balance general (balance sheet) summary

    Shows totals for:
    - Assets (current, fixed, other) - Global accounts only
    - Liabilities (current, long-term, other) - Global accounts only
    - Equity
    """
    # Get all global accounts grouped by type
    result = await db.execute(
        select(
            BalanceAccount.account_type,
            func.sum(BalanceAccount.balance).label('total')
        ).where(
            BalanceAccount.school_id.is_(None),
            BalanceAccount.is_active == True
        ).group_by(BalanceAccount.account_type)
    )

    totals = {row.account_type: float(row.total or 0) for row in result}

    # Calculate totals
    total_assets = sum(
        totals.get(at, 0) for at in [
            AccountType.ASSET_CURRENT,
            AccountType.ASSET_FIXED,
            AccountType.ASSET_OTHER
        ]
    )
    total_liabilities = sum(
        totals.get(at, 0) for at in [
            AccountType.LIABILITY_CURRENT,
            AccountType.LIABILITY_LONG,
            AccountType.LIABILITY_OTHER
        ]
    )
    total_equity = sum(
        totals.get(at, 0) for at in [
            AccountType.EQUITY_CAPITAL,
            AccountType.EQUITY_RETAINED,
            AccountType.EQUITY_OTHER
        ]
    )

    return {
        "assets": {
            "current": totals.get(AccountType.ASSET_CURRENT, 0),
            "fixed": totals.get(AccountType.ASSET_FIXED, 0),
            "other": totals.get(AccountType.ASSET_OTHER, 0),
            "total": total_assets
        },
        "liabilities": {
            "current": totals.get(AccountType.LIABILITY_CURRENT, 0),
            "long_term": totals.get(AccountType.LIABILITY_LONG, 0),
            "other": totals.get(AccountType.LIABILITY_OTHER, 0),
            "total": total_liabilities
        },
        "equity": {
            "capital": totals.get(AccountType.EQUITY_CAPITAL, 0),
            "retained": totals.get(AccountType.EQUITY_RETAINED, 0),
            "other": totals.get(AccountType.EQUITY_OTHER, 0),
            "total": total_equity
        },
        "net_worth": total_assets - total_liabilities,
        "balanced": abs((total_assets) - (total_liabilities + total_equity)) < 0.01
    }


@router.get(
    "/balance-general/detailed",
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_balance_general_detailed(
    db: DatabaseSession
):
    """
    Get detailed global balance general with account breakdown
    """
    # Get all global accounts
    result = await db.execute(
        select(BalanceAccount)
        .where(
            BalanceAccount.school_id.is_(None),
            BalanceAccount.is_active == True
        )
        .order_by(BalanceAccount.code)
    )
    accounts = result.scalars().all()

    # Group by type
    by_type = {}
    for account in accounts:
        type_key = account.account_type.value
        if type_key not in by_type:
            by_type[type_key] = []
        by_type[type_key].append({
            "id": str(account.id),
            "code": account.code,
            "name": account.name,
            "balance": float(account.balance),
            "net_value": float(account.net_value) if account.net_value else float(account.balance)
        })

    # Calculate totals
    total_assets = sum(
        a["balance"] for accounts in by_type.values()
        for a in accounts
        if any(a["code"].startswith(p) for p in ["1"])  # Asset codes start with 1
    )
    total_liabilities = sum(
        a["balance"] for accounts in by_type.values()
        for a in accounts
        if any(a["code"].startswith(p) for p in ["2"])  # Liability codes start with 2
    )
    total_equity = sum(
        a["balance"] for accounts in by_type.values()
        for a in accounts
        if any(a["code"].startswith(p) for p in ["3"])  # Equity codes start with 3
    )

    return {
        "accounts_by_type": by_type,
        "summary": {
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "total_equity": total_equity,
            "net_worth": total_assets - total_liabilities
        }
    }


# ============================================
# Global Expenses (Gastos del Negocio)
# ============================================

@router.post(
    "/expenses",
    response_model=GlobalExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_school_admin)]
)
async def create_global_expense(
    expense_data: GlobalExpenseCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a global expense (business-wide)

    For expenses like utilities, salaries, rent that aren't school-specific.
    """
    expense = Expense(
        school_id=None,  # Global expense
        category=expense_data.category,
        description=expense_data.description,
        amount=expense_data.amount,
        expense_date=expense_data.expense_date,
        due_date=expense_data.due_date,
        vendor=expense_data.vendor,
        receipt_number=expense_data.receipt_number,
        is_recurring=expense_data.is_recurring,
        recurring_period=expense_data.recurring_period,
        notes=expense_data.notes,
        created_by=current_user.id
    )

    db.add(expense)
    await db.commit()
    await db.refresh(expense)

    return GlobalExpenseResponse.model_validate(expense)


@router.get(
    "/expenses",
    response_model=list[ExpenseListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_expenses(
    db: DatabaseSession,
    category: ExpenseCategory = Query(None, description="Filter by category"),
    is_paid: bool = Query(None, description="Filter by payment status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List global expenses (school_id = NULL)
    """
    query = select(Expense).where(
        Expense.school_id.is_(None),
        Expense.is_active == True
    )

    if category:
        query = query.where(Expense.category == category)
    if is_paid is not None:
        query = query.where(Expense.is_paid == is_paid)

    query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    expenses = result.scalars().all()

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
    dependencies=[Depends(require_any_school_admin)]
)
async def get_pending_global_expenses(
    db: DatabaseSession
):
    """
    Get all pending (unpaid) global expenses
    """
    result = await db.execute(
        select(Expense).where(
            Expense.school_id.is_(None),
            Expense.is_paid == False,
            Expense.is_active == True
        ).order_by(Expense.due_date)
    )
    expenses = result.scalars().all()

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
    "/expenses/{expense_id}",
    response_model=GlobalExpenseResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_expense(
    expense_id: UUID,
    db: DatabaseSession
):
    """Get global expense by ID"""
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.school_id.is_(None)
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global expense not found"
        )

    return GlobalExpenseResponse.model_validate(expense)


@router.patch(
    "/expenses/{expense_id}",
    response_model=GlobalExpenseResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def update_global_expense(
    expense_id: UUID,
    expense_data: ExpenseUpdate,
    db: DatabaseSession
):
    """Update a global expense"""
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.school_id.is_(None)
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global expense not found"
        )

    # Update fields
    update_data = expense_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.commit()
    await db.refresh(expense)

    return GlobalExpenseResponse.model_validate(expense)


@router.post(
    "/expenses/{expense_id}/pay",
    response_model=GlobalExpenseResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def pay_global_expense(
    expense_id: UUID,
    payment: ExpensePayment,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Record a payment for a global expense

    Updates balance accounts (Caja/Banco) automatically.
    """
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.school_id.is_(None)
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global expense not found"
        )

    if expense.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expense is already fully paid"
        )

    remaining = expense.balance
    if payment.amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payment.amount}) exceeds balance ({remaining})"
        )

    # Update global balance account (deduct from Caja or Banco)
    from app.services.balance_integration import BalanceIntegrationService
    balance_service = BalanceIntegrationService(db)

    try:
        await balance_service.record_expense_payment(
            amount=payment.amount,
            payment_method=payment.payment_method,
            description=f"Pago gasto: {expense.description}",
            created_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Update expense only after successful balance deduction
    expense.amount_paid = (expense.amount_paid or Decimal("0")) + payment.amount
    if expense.amount_paid >= expense.amount:
        expense.is_paid = True

    await db.commit()
    await db.refresh(expense)

    return GlobalExpenseResponse.model_validate(expense)


# ============================================
# Global Accounts Payable (Cuentas por Pagar)
# ============================================

@router.post(
    "/payables",
    response_model=GlobalAccountsPayableResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_school_admin)]
)
async def create_global_payable(
    payable_data: GlobalAccountsPayableCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a global accounts payable (supplier debt)

    For tracking money owed BY the business to suppliers.
    """
    payable = AccountsPayable(
        school_id=None,  # Global payable
        vendor=payable_data.vendor,
        amount=payable_data.amount,
        description=payable_data.description,
        category=payable_data.category,
        invoice_number=payable_data.invoice_number,
        invoice_date=payable_data.invoice_date,
        due_date=payable_data.due_date,
        notes=payable_data.notes,
        created_by=current_user.id
    )
    db.add(payable)
    await db.commit()
    await db.refresh(payable)

    return GlobalAccountsPayableResponse.model_validate(payable)


@router.get(
    "/payables",
    response_model=list[AccountsPayableListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_payables(
    db: DatabaseSession,
    is_paid: bool = Query(None, description="Filter by payment status"),
    is_overdue: bool = Query(None, description="Filter by overdue status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List global accounts payable (school_id = NULL)
    """
    query = select(AccountsPayable).where(
        AccountsPayable.school_id.is_(None)
    )

    if is_paid is not None:
        query = query.where(AccountsPayable.is_paid == is_paid)

    query = query.order_by(AccountsPayable.due_date).offset(skip).limit(limit)
    result = await db.execute(query)
    payables = result.scalars().all()

    # Filter by overdue if requested
    if is_overdue is not None:
        payables = [p for p in payables if p.is_overdue == is_overdue]

    return [
        AccountsPayableListResponse(
            id=p.id,
            vendor=p.vendor,
            amount=p.amount,
            amount_paid=p.amount_paid,
            balance=p.balance,
            description=p.description,
            category=p.category,
            invoice_number=p.invoice_number,
            invoice_date=p.invoice_date,
            due_date=p.due_date,
            is_paid=p.is_paid,
            is_overdue=p.is_overdue
        )
        for p in payables
    ]


@router.get(
    "/payables/pending",
    response_model=list[AccountsPayableListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def get_pending_global_payables(
    db: DatabaseSession
):
    """
    Get all pending (unpaid) global payables
    """
    result = await db.execute(
        select(AccountsPayable).where(
            AccountsPayable.school_id.is_(None),
            AccountsPayable.is_paid == False
        ).order_by(AccountsPayable.due_date)
    )
    payables = result.scalars().all()

    return [
        AccountsPayableListResponse(
            id=p.id,
            vendor=p.vendor,
            amount=p.amount,
            amount_paid=p.amount_paid,
            balance=p.balance,
            description=p.description,
            category=p.category,
            invoice_number=p.invoice_number,
            invoice_date=p.invoice_date,
            due_date=p.due_date,
            is_paid=p.is_paid,
            is_overdue=p.is_overdue
        )
        for p in payables
    ]


@router.get(
    "/payables/{payable_id}",
    response_model=GlobalAccountsPayableResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_payable(
    payable_id: UUID,
    db: DatabaseSession
):
    """Get global payable by ID"""
    result = await db.execute(
        select(AccountsPayable).where(
            AccountsPayable.id == payable_id,
            AccountsPayable.school_id.is_(None)
        )
    )
    payable = result.scalar_one_or_none()

    if not payable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global payable not found"
        )

    return GlobalAccountsPayableResponse.model_validate(payable)


@router.post(
    "/payables/{payable_id}/pay",
    response_model=GlobalAccountsPayableResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def pay_global_payable(
    payable_id: UUID,
    payment: AccountsPayablePayment,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Record a payment on global accounts payable

    Updates balance accounts (Caja/Banco) automatically.
    """
    result = await db.execute(
        select(AccountsPayable).where(
            AccountsPayable.id == payable_id,
            AccountsPayable.school_id.is_(None)
        )
    )
    payable = result.scalar_one_or_none()

    if not payable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global payable not found"
        )

    if payable.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payable is already fully paid"
        )

    remaining = payable.balance
    if payment.amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payment.amount}) exceeds balance ({remaining})"
        )

    # Update payable
    payable.amount_paid = (payable.amount_paid or Decimal("0")) + payment.amount
    if payable.amount_paid >= payable.amount:
        payable.is_paid = True

    # Update global balance account (deduct from Caja or Banco)
    from app.services.balance_integration import BalanceIntegrationService
    balance_service = BalanceIntegrationService(db)

    await balance_service.record_expense_payment(
        amount=payment.amount,
        payment_method=payment.payment_method,
        description=f"Pago a proveedor: {payable.vendor}",
        created_by=current_user.id
    )

    await db.commit()
    await db.refresh(payable)

    return GlobalAccountsPayableResponse.model_validate(payable)


# ============================================
# Global Patrimony Summary
# ============================================

@router.get(
    "/patrimony/summary",
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_patrimony_summary(
    db: DatabaseSession
):
    """
    Get global patrimony summary (business-wide)

    PATRIMONY = ASSETS - LIABILITIES

    Assets:
    - Cash (Caja) + Bank (Banco)
    - Inventory (valued at cost)
    - Fixed Assets

    Liabilities:
    - Accounts Payable (suppliers)
    - Debts
    """
    from app.services.balance_integration import BalanceIntegrationService
    from app.models.product import Product, Inventory

    balance_service = BalanceIntegrationService(db)
    cash_balances = await balance_service.get_global_cash_balances()

    # Get all global assets and liabilities from balance_accounts
    result = await db.execute(
        select(
            BalanceAccount.account_type,
            func.sum(BalanceAccount.balance).label('total')
        ).where(
            BalanceAccount.school_id.is_(None),
            BalanceAccount.is_active == True
        ).group_by(BalanceAccount.account_type)
    )

    totals_by_type = {row.account_type: float(row.total or 0) for row in result}

    # Calculate INVENTORY VALUE (sum of stock * cost for all products across all schools)
    result = await db.execute(
        select(func.sum(Inventory.quantity * Product.cost))
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Product.is_active == True,
            Inventory.quantity > 0
        )
    )
    inventory_value = float(result.scalar() or 0)

    # Calculate ACCOUNTS RECEIVABLE (pending amounts from all schools)
    result = await db.execute(
        select(func.sum(AccountsReceivable.amount - AccountsReceivable.amount_paid))
        .where(
            AccountsReceivable.is_paid == False
        )
    )
    pending_receivables = float(result.scalar() or 0)

    # Calculate pending payables (from all schools, global business)
    result = await db.execute(
        select(func.sum(AccountsPayable.amount - AccountsPayable.amount_paid))
        .where(
            AccountsPayable.is_paid == False
        )
    )
    pending_payables = float(result.scalar() or 0)

    # Calculate pending expenses (from all schools, global business)
    result = await db.execute(
        select(func.sum(Expense.amount - Expense.amount_paid))
        .where(
            Expense.is_paid == False,
            Expense.is_active == True
        )
    )
    pending_expenses = float(result.scalar() or 0)

    # Extract balance values from cash_balances dict objects
    # Note: get_global_cash_balances returns caja_menor, caja_mayor, nequi, banco
    caja_menor = cash_balances.get("caja_menor")
    caja_mayor = cash_balances.get("caja_mayor")
    nequi = cash_balances.get("nequi")
    banco = cash_balances.get("banco")

    caja_menor_balance = float(caja_menor["balance"]) if caja_menor else 0
    caja_mayor_balance = float(caja_mayor["balance"]) if caja_mayor else 0
    nequi_balance = float(nequi["balance"]) if nequi else 0
    banco_balance = float(banco["balance"]) if banco else 0

    total_cash = caja_menor_balance + caja_mayor_balance
    total_liquid = float(cash_balances.get("total_liquid", 0))

    # Calculate total current assets (liquid + inventory + receivables)
    current_assets = total_liquid + inventory_value + pending_receivables

    total_assets = (
        current_assets +
        totals_by_type.get(AccountType.ASSET_FIXED, 0) +
        totals_by_type.get(AccountType.ASSET_OTHER, 0)
    )

    total_liabilities = (
        pending_payables +
        pending_expenses +
        totals_by_type.get(AccountType.LIABILITY_CURRENT, 0) +
        totals_by_type.get(AccountType.LIABILITY_LONG, 0)
    )

    # Calculate total banco (nequi + banco_cuenta)
    total_banco = nequi_balance + banco_balance

    return {
        "assets": {
            "caja": total_cash,  # caja_menor + caja_mayor
            "banco": total_banco,  # nequi + banco_cuenta
            "caja_menor": caja_menor_balance,
            "caja_mayor": caja_mayor_balance,
            "nequi": nequi_balance,
            "banco_cuenta": banco_balance,
            "total_liquid": total_liquid,
            "inventory": inventory_value,
            "receivables": pending_receivables,
            "current_assets": current_assets,
            "fixed_assets": totals_by_type.get(AccountType.ASSET_FIXED, 0),
            "other_assets": totals_by_type.get(AccountType.ASSET_OTHER, 0),
            "total": total_assets
        },
        "liabilities": {
            "pending_payables": pending_payables,
            "pending_expenses": pending_expenses,
            "current": totals_by_type.get(AccountType.LIABILITY_CURRENT, 0),
            "long_term": totals_by_type.get(AccountType.LIABILITY_LONG, 0),
            "total": total_liabilities
        },
        "net_patrimony": total_assets - total_liabilities
    }


# ============================================
# Global Accounts Receivable (Cuentas por Cobrar)
# ============================================

@router.post(
    "/receivables",
    response_model=GlobalAccountsReceivableResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_any_school_admin)]
)
async def create_global_receivable(
    receivable_data: GlobalAccountsReceivableCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a global accounts receivable (customer debt)

    For tracking money owed TO the business by customers.
    """
    receivable = AccountsReceivable(
        school_id=None,  # Global receivable
        client_id=receivable_data.client_id,
        sale_id=receivable_data.sale_id,
        order_id=receivable_data.order_id,
        amount=receivable_data.amount,
        description=receivable_data.description,
        invoice_date=receivable_data.invoice_date,
        due_date=receivable_data.due_date,
        notes=receivable_data.notes,
        created_by=current_user.id
    )
    db.add(receivable)
    await db.commit()
    await db.refresh(receivable)

    return GlobalAccountsReceivableResponse.model_validate(receivable)


@router.get(
    "/receivables",
    response_model=list[AccountsReceivableListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_receivables(
    db: DatabaseSession,
    is_paid: bool = Query(None, description="Filter by payment status"),
    is_overdue: bool = Query(None, description="Filter by overdue status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List global accounts receivable (school_id = NULL)
    """
    query = select(AccountsReceivable).where(
        AccountsReceivable.school_id.is_(None)
    )

    if is_paid is not None:
        query = query.where(AccountsReceivable.is_paid == is_paid)

    query = query.order_by(AccountsReceivable.due_date).offset(skip).limit(limit)
    result = await db.execute(query)
    receivables = result.scalars().all()

    # Filter by overdue if requested
    if is_overdue is not None:
        receivables = [r for r in receivables if r.is_overdue == is_overdue]

    return [
        AccountsReceivableListResponse(
            id=r.id,
            client_id=r.client_id,
            client_name=None,  # Would need to join with clients table
            amount=r.amount,
            amount_paid=r.amount_paid,
            balance=r.balance,
            description=r.description,
            invoice_date=r.invoice_date,
            due_date=r.due_date,
            is_paid=r.is_paid,
            is_overdue=r.is_overdue
        )
        for r in receivables
    ]


@router.get(
    "/receivables/pending",
    response_model=list[AccountsReceivableListResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def get_pending_global_receivables(
    db: DatabaseSession
):
    """
    Get all pending (unpaid) global receivables
    """
    result = await db.execute(
        select(AccountsReceivable).where(
            AccountsReceivable.school_id.is_(None),
            AccountsReceivable.is_paid == False
        ).order_by(AccountsReceivable.due_date)
    )
    receivables = result.scalars().all()

    return [
        AccountsReceivableListResponse(
            id=r.id,
            client_id=r.client_id,
            client_name=None,
            amount=r.amount,
            amount_paid=r.amount_paid,
            balance=r.balance,
            description=r.description,
            invoice_date=r.invoice_date,
            due_date=r.due_date,
            is_paid=r.is_paid,
            is_overdue=r.is_overdue
        )
        for r in receivables
    ]


@router.get(
    "/receivables/{receivable_id}",
    response_model=GlobalAccountsReceivableResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_receivable(
    receivable_id: UUID,
    db: DatabaseSession
):
    """Get global receivable by ID"""
    result = await db.execute(
        select(AccountsReceivable).where(
            AccountsReceivable.id == receivable_id,
            AccountsReceivable.school_id.is_(None)
        )
    )
    receivable = result.scalar_one_or_none()

    if not receivable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global receivable not found"
        )

    return GlobalAccountsReceivableResponse.model_validate(receivable)


@router.post(
    "/receivables/{receivable_id}/pay",
    response_model=GlobalAccountsReceivableResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def pay_global_receivable(
    receivable_id: UUID,
    payment: AccountsReceivablePayment,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Record a payment on global accounts receivable

    Updates balance accounts (Caja/Banco) automatically.
    """
    result = await db.execute(
        select(AccountsReceivable).where(
            AccountsReceivable.id == receivable_id,
            AccountsReceivable.school_id.is_(None)
        )
    )
    receivable = result.scalar_one_or_none()

    if not receivable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global receivable not found"
        )

    if receivable.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Receivable is already fully paid"
        )

    remaining = receivable.balance
    if payment.amount > remaining:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payment.amount}) exceeds balance ({remaining})"
        )

    # Update receivable
    receivable.amount_paid = (receivable.amount_paid or Decimal("0")) + payment.amount
    if receivable.amount_paid >= receivable.amount:
        receivable.is_paid = True

    # Update global balance account (add to Caja or Banco)
    from app.services.balance_integration import BalanceIntegrationService
    balance_service = BalanceIntegrationService(db)

    await balance_service.record_income_payment(
        amount=payment.amount,
        payment_method=payment.payment_method,
        description=f"Cobro CxC: {receivable.description}",
        created_by=current_user.id
    )

    await db.commit()
    await db.refresh(receivable)

    return GlobalAccountsReceivableResponse.model_validate(receivable)


# ============================================
# Global Transactions (for Reports)
# ============================================

# Category labels in Spanish
EXPENSE_CATEGORY_LABELS = {
    ExpenseCategory.RENT: "Arriendo",
    ExpenseCategory.UTILITIES: "Servicios",
    ExpenseCategory.PAYROLL: "Nomina",
    ExpenseCategory.SUPPLIES: "Suministros",
    ExpenseCategory.INVENTORY: "Inventario",
    ExpenseCategory.TRANSPORT: "Transporte",
    ExpenseCategory.MAINTENANCE: "Mantenimiento",
    ExpenseCategory.MARKETING: "Marketing",
    ExpenseCategory.TAXES: "Impuestos",
    ExpenseCategory.BANK_FEES: "Comisiones Bancarias",
    ExpenseCategory.OTHER: "Otros",
}


@router.get(
    "/transactions",
    response_model=list[TransactionListItemResponse],
    dependencies=[Depends(require_any_school_admin)]
)
async def list_global_transactions(
    db: DatabaseSession,
    start_date: date | None = Query(None, description="Filter from date"),
    end_date: date | None = Query(None, description="Filter to date"),
    transaction_type: TransactionType | None = Query(None, description="Filter by type (income/expense)"),
    school_id: UUID | None = Query(None, description="Filter by school"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """
    List transactions (global and school-specific)

    Returns all transactions for reporting purposes.
    """
    from sqlalchemy.orm import joinedload

    query = select(Transaction).options(
        joinedload(Transaction.school)
    )

    # Apply filters
    if start_date:
        query = query.where(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.where(Transaction.transaction_date <= end_date)
    if transaction_type:
        query = query.where(Transaction.type == transaction_type)
    if school_id:
        query = query.where(Transaction.school_id == school_id)

    query = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().unique().all()

    return [
        TransactionListItemResponse(
            id=t.id,
            type=t.type,
            amount=t.amount,
            payment_method=t.payment_method,
            description=t.description,
            category=t.category,
            reference_code=t.reference_code,
            transaction_date=t.transaction_date,
            created_at=t.created_at,
            school_id=t.school_id,
            school_name=t.school.name if t.school else None
        )
        for t in transactions
    ]


@router.get(
    "/expenses/summary-by-category",
    response_model=list[ExpenseCategorySummary],
    dependencies=[Depends(require_any_school_admin)]
)
async def get_expenses_summary_by_category(
    db: DatabaseSession,
    start_date: date | None = Query(None, description="Filter from date"),
    end_date: date | None = Query(None, description="Filter to date")
):
    """
    Get expenses grouped by category

    Returns summary of expenses by category for pie/bar charts.
    """
    query = select(
        Expense.category,
        func.count(Expense.id).label('count'),
        func.sum(Expense.amount).label('total_amount'),
        func.sum(Expense.amount_paid).label('paid_amount')
    ).where(
        Expense.is_active == True
    ).group_by(Expense.category)

    # Apply date filters
    if start_date:
        query = query.where(Expense.expense_date >= start_date)
    if end_date:
        query = query.where(Expense.expense_date <= end_date)

    result = await db.execute(query)
    rows = result.all()

    # Calculate total for percentages
    total_expenses = sum(float(row.total_amount or 0) for row in rows)

    summaries = []
    for row in rows:
        total_amount = Decimal(str(row.total_amount or 0))
        paid_amount = Decimal(str(row.paid_amount or 0))
        pending_amount = total_amount - paid_amount
        percentage = Decimal(str(round((float(total_amount) / total_expenses * 100) if total_expenses > 0 else 0, 2)))

        # Handle None category gracefully
        if row.category is None:
            category_label = "Sin Categoría"
        else:
            category_label = EXPENSE_CATEGORY_LABELS.get(row.category, str(row.category.value))

        summaries.append(ExpenseCategorySummary(
            category=row.category,
            category_label=category_label,
            total_amount=total_amount,
            paid_amount=paid_amount,
            pending_amount=pending_amount,
            count=row.count,
            percentage=percentage
        ))

    # Sort by total amount descending
    summaries.sort(key=lambda x: x.total_amount, reverse=True)

    return summaries


@router.get(
    "/cash-flow",
    response_model=CashFlowReportResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_cash_flow_report(
    db: DatabaseSession,
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    group_by: str = Query("day", description="Group by: day, week, month")
):
    """
    Get cash flow report for a period

    Shows income vs expenses over time for line charts.
    """
    from datetime import timedelta
    from collections import defaultdict

    # Validate group_by
    if group_by not in ("day", "week", "month"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="group_by must be: day, week, or month"
        )

    # Get all transactions in range
    query = select(Transaction).where(
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).order_by(Transaction.transaction_date)

    result = await db.execute(query)
    transactions = result.scalars().all()

    # Group transactions by period
    periods_data = defaultdict(lambda: {"income": Decimal("0"), "expenses": Decimal("0")})

    for t in transactions:
        # Determine period key
        if group_by == "day":
            period_key = t.transaction_date.isoformat()
            period_label = t.transaction_date.strftime("%d %b")
        elif group_by == "week":
            # Get ISO week
            iso_cal = t.transaction_date.isocalendar()
            period_key = f"{iso_cal.year}-W{iso_cal.week:02d}"
            period_label = f"Sem {iso_cal.week}"
        else:  # month
            period_key = t.transaction_date.strftime("%Y-%m")
            period_label = t.transaction_date.strftime("%B %Y")

        # Add amount to appropriate bucket
        if t.type == TransactionType.INCOME:
            periods_data[period_key]["income"] += t.amount
        else:  # EXPENSE or TRANSFER (count transfers as expense for cash flow)
            periods_data[period_key]["expenses"] += t.amount

        periods_data[period_key]["label"] = period_label

    # Also include expenses not in transactions
    expense_query = select(Expense).where(
        Expense.expense_date >= start_date,
        Expense.expense_date <= end_date,
        Expense.is_active == True,
        Expense.is_paid == True
    )
    result = await db.execute(expense_query)
    expenses = result.scalars().all()

    for e in expenses:
        if group_by == "day":
            period_key = e.expense_date.isoformat()
            period_label = e.expense_date.strftime("%d %b")
        elif group_by == "week":
            iso_cal = e.expense_date.isocalendar()
            period_key = f"{iso_cal.year}-W{iso_cal.week:02d}"
            period_label = f"Sem {iso_cal.week}"
        else:
            period_key = e.expense_date.strftime("%Y-%m")
            period_label = e.expense_date.strftime("%B %Y")

        periods_data[period_key]["expenses"] += e.amount_paid
        periods_data[period_key]["label"] = period_label

    # Convert to list and calculate net
    periods = []
    total_income = Decimal("0")
    total_expenses = Decimal("0")

    for period_key in sorted(periods_data.keys()):
        data = periods_data[period_key]
        income = data["income"]
        expenses = data["expenses"]
        net = income - expenses

        total_income += income
        total_expenses += expenses

        periods.append(CashFlowPeriodItem(
            period=period_key,
            period_label=data.get("label", period_key),
            income=income,
            expenses=expenses,
            net=net
        ))

    return CashFlowReportResponse(
        period_start=start_date,
        period_end=end_date,
        group_by=group_by,
        total_income=total_income,
        total_expenses=total_expenses,
        net_flow=total_income - total_expenses,
        periods=periods
    )
