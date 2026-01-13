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
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_any_school_admin
from app.models.user import UserRole
from app.models.accounting import (
    TransactionType, ExpenseCategory, AccountType, AccPaymentMethod, AdjustmentReason,
    BalanceAccount, BalanceEntry, Expense, AccountsPayable, AccountsReceivable, Transaction,
    ExpenseAdjustment
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
    TransactionListItemResponse, ExpenseCategorySummary, CashFlowPeriodItem, CashFlowReportResponse,
    # Expense Adjustment schemas
    ExpenseAdjustmentRequest, ExpenseRevertRequest, PartialRefundRequest,
    ExpenseAdjustmentResponse, ExpenseAdjustmentListResponse,
    ExpenseAdjustmentHistoryResponse, AdjustmentListPaginatedResponse
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
# Unified Balance Entries (All Global Accounts)
# ============================================

@router.get(
    "/balance-entries",
    dependencies=[Depends(require_any_school_admin)]
)
async def list_all_global_balance_entries(
    db: DatabaseSession,
    start_date: date | None = Query(None, description="Filter entries from this date"),
    end_date: date | None = Query(None, description="Filter entries until this date"),
    account_id: UUID | None = Query(None, description="Filter by specific account"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List all balance entries from global accounts (unified log)

    Returns entries with account info for audit/log purposes.
    Ordered by created_at descending (most recent first).
    """
    # Build base query with join to get account info
    query = (
        select(
            BalanceEntry,
            BalanceAccount.code.label('account_code'),
            BalanceAccount.name.label('account_name')
        )
        .join(BalanceAccount, BalanceEntry.account_id == BalanceAccount.id)
        .where(BalanceAccount.school_id.is_(None))  # Only global accounts
    )

    # Apply filters
    if start_date:
        query = query.where(BalanceEntry.entry_date >= start_date)
    if end_date:
        query = query.where(BalanceEntry.entry_date <= end_date)
    if account_id:
        query = query.where(BalanceEntry.account_id == account_id)

    # Get total count for pagination
    count_query = (
        select(func.count(BalanceEntry.id))
        .join(BalanceAccount, BalanceEntry.account_id == BalanceAccount.id)
        .where(BalanceAccount.school_id.is_(None))
    )
    if start_date:
        count_query = count_query.where(BalanceEntry.entry_date >= start_date)
    if end_date:
        count_query = count_query.where(BalanceEntry.entry_date <= end_date)
    if account_id:
        count_query = count_query.where(BalanceEntry.account_id == account_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated entries
    query = query.order_by(BalanceEntry.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    rows = result.all()

    return {
        "items": [
            {
                "id": str(row.BalanceEntry.id),
                "entry_date": row.BalanceEntry.entry_date.isoformat(),
                "created_at": row.BalanceEntry.created_at.isoformat(),
                "account_id": str(row.BalanceEntry.account_id),
                "account_code": row.account_code,
                "account_name": row.account_name,
                "amount": float(row.BalanceEntry.amount),
                "balance_after": float(row.BalanceEntry.balance_after),
                "description": row.BalanceEntry.description,
                "reference": row.BalanceEntry.reference
            }
            for row in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


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

    Includes payment info (account name, method, date) for paid expenses.
    """
    # Query with LEFT JOIN to get payment account name
    query = (
        select(Expense, BalanceAccount.name.label("payment_account_name"))
        .outerjoin(BalanceAccount, BalanceAccount.id == Expense.payment_account_id)
        .where(
            Expense.school_id.is_(None),
            Expense.is_active == True
        )
    )

    if category:
        query = query.where(Expense.category == category)
    if is_paid is not None:
        query = query.where(Expense.is_paid == is_paid)

    query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

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
            balance=e.balance,
            payment_method=e.payment_method,
            payment_account_name=payment_account_name,
            paid_at=e.paid_at
        )
        for e, payment_account_name in rows
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
            balance=e.balance,
            payment_method=e.payment_method,
            payment_account_name=None,  # Pending expenses don't have payment info
            paid_at=e.paid_at
        )
        for e in expenses
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


@router.post(
    "/expenses/check-balance",
    dependencies=[Depends(require_any_school_admin)]
)
async def check_expense_balance(
    amount: Decimal = Query(..., gt=0, description="Monto a verificar"),
    payment_method: AccPaymentMethod = Query(..., description="Método de pago"),
    db: DatabaseSession = None
):
    """
    Verifica si hay fondos suficientes para pagar un gasto.

    Si el pago es en efectivo y Caja Menor no alcanza, informa sobre
    la disponibilidad de Caja Mayor como fallback.

    Returns:
        can_pay: bool - Si se puede realizar el pago
        source: str - Cuenta que se usaría (caja_menor, nequi, banco)
        source_balance: Decimal - Balance disponible en la cuenta
        fallback_available: bool - Si hay fallback disponible
        fallback_source: str | None - Cuenta de fallback (caja_mayor)
        fallback_balance: Decimal | None - Balance del fallback
    """
    from app.services.balance_integration import BalanceIntegrationService, PAYMENT_METHOD_TO_ACCOUNT

    balance_service = BalanceIntegrationService(db)

    # Determinar cuenta principal
    account_key = PAYMENT_METHOD_TO_ACCOUNT.get(payment_method)
    if not account_key:
        return {
            "can_pay": False,
            "source": None,
            "source_balance": Decimal("0"),
            "fallback_available": False,
            "fallback_source": None,
            "fallback_balance": None,
            "message": "Método de pago no requiere verificación de fondos"
        }

    # Obtener balance de la cuenta principal
    source_balance = await balance_service.get_account_balance(account_key) or Decimal("0")

    # Verificar si alcanza
    can_pay = source_balance >= amount

    # Si es CASH y no alcanza, verificar Caja Mayor como fallback
    fallback_available = False
    fallback_source = None
    fallback_balance = None

    if payment_method == AccPaymentMethod.CASH and not can_pay:
        fallback_source = "caja_mayor"
        fallback_balance = await balance_service.get_account_balance("caja_mayor") or Decimal("0")
        fallback_available = fallback_balance >= amount

    return {
        "can_pay": can_pay,
        "source": account_key,
        "source_balance": source_balance,
        "fallback_available": fallback_available,
        "fallback_source": fallback_source,
        "fallback_balance": fallback_balance
    }


@router.get(
    "/expenses/{expense_id}",
    response_model=GlobalExpenseResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_global_expense(
    expense_id: UUID,
    db: DatabaseSession
):
    """Get global expense by ID with payment account info"""
    result = await db.execute(
        select(Expense, BalanceAccount.name.label("payment_account_name"))
        .outerjoin(BalanceAccount, BalanceAccount.id == Expense.payment_account_id)
        .where(
            Expense.id == expense_id,
            Expense.school_id.is_(None)
        )
    )
    row = result.one_or_none()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global expense not found"
        )

    expense, payment_account_name = row
    response = GlobalExpenseResponse.model_validate(expense)
    response.payment_account_name = payment_account_name
    return response


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

    payment_account_id = None
    try:
        # Si use_fallback es True y el pago es en efectivo, usar Caja Mayor directamente
        if payment.use_fallback and payment.payment_method == AccPaymentMethod.CASH:
            await balance_service.record_expense_payment_from_account(
                amount=payment.amount,
                account_key="caja_mayor",
                description=f"Pago gasto (desde Caja Mayor): {expense.description}",
                created_by=current_user.id
            )
            # Get Caja Mayor account ID
            caja_mayor = await db.execute(
                select(BalanceAccount).where(
                    BalanceAccount.code == "1102",
                    BalanceAccount.school_id.is_(None)
                )
            )
            caja_mayor_account = caja_mayor.scalar_one_or_none()
            if caja_mayor_account:
                payment_account_id = caja_mayor_account.id
        else:
            await balance_service.record_expense_payment(
                amount=payment.amount,
                payment_method=payment.payment_method,
                description=f"Pago gasto: {expense.description}",
                created_by=current_user.id
            )
            # Get the account ID used for the payment
            payment_account_id = await balance_service.get_account_for_payment_method(
                payment.payment_method
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    # Update expense with payment info
    expense.amount_paid = (expense.amount_paid or Decimal("0")) + payment.amount
    # Handle both enum and string payment_method
    expense.payment_method = payment.payment_method.value if hasattr(payment.payment_method, 'value') else payment.payment_method
    expense.payment_account_id = payment_account_id
    expense.paid_at = datetime.utcnow()

    if expense.amount_paid >= expense.amount:
        expense.is_paid = True

    await db.commit()
    await db.refresh(expense)

    # Get payment account name for response
    payment_account_name = None
    if expense.payment_account_id:
        result = await db.execute(
            select(BalanceAccount.name).where(BalanceAccount.id == expense.payment_account_id)
        )
        payment_account_name = result.scalar_one_or_none()

    response = GlobalExpenseResponse.model_validate(expense)
    response.payment_account_name = payment_account_name
    return response


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

    await balance_service.record_income(
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


# ============================================
# Expense Adjustments (Rollbacks)
# ============================================

@router.post(
    "/expenses/{expense_id}/adjust",
    response_model=ExpenseAdjustmentResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def adjust_expense(
    expense_id: UUID,
    adjustment_data: ExpenseAdjustmentRequest,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Adjust a paid expense's amount and/or payment account.

    Use cases:
    - Correct a wrong payment amount
    - Move payment from one account to another (e.g., Caja to Banco)
    - Both amount and account correction

    Creates compensatory balance entries to maintain accounting integrity.

    Args:
        expense_id: The expense UUID to adjust
        adjustment_data: The adjustment details

    Returns:
        ExpenseAdjustmentResponse with adjustment details
    """
    from app.services.expense_adjustment import ExpenseAdjustmentService
    from app.models.user import User

    service = ExpenseAdjustmentService(db)

    try:
        adjustment = await service.adjust_expense(
            expense_id=expense_id,
            new_amount=adjustment_data.new_amount,
            new_payment_account_id=adjustment_data.new_payment_account_id,
            new_payment_method=adjustment_data.new_payment_method,
            reason=adjustment_data.reason,
            description=adjustment_data.description,
            adjusted_by=current_user.id
        )

        await db.commit()

        # Build response with account names
        response = ExpenseAdjustmentResponse.model_validate(adjustment)

        # Get account names
        if adjustment.previous_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adjustment.previous_payment_account_id
                )
            )
            response.previous_payment_account_name = result.scalar_one_or_none()

        if adjustment.new_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adjustment.new_payment_account_id
                )
            )
            response.new_payment_account_name = result.scalar_one_or_none()

        # Get username
        result = await db.execute(
            select(User.username).where(User.id == current_user.id)
        )
        response.adjusted_by_username = result.scalar_one_or_none()

        return response

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al ajustar gasto: {str(e)}"
        )


@router.post(
    "/expenses/{expense_id}/revert",
    response_model=ExpenseAdjustmentResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def revert_expense_payment(
    expense_id: UUID,
    revert_data: ExpenseRevertRequest,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Completely revert an expense payment (full rollback).

    This returns the full paid amount to the original account
    and marks the expense as unpaid.

    Use this when a payment was made in error and needs to be undone entirely.

    Args:
        expense_id: The expense UUID to revert
        revert_data: Optional description of the reversion

    Returns:
        ExpenseAdjustmentResponse with reversion details
    """
    from app.services.expense_adjustment import ExpenseAdjustmentService
    from app.models.user import User

    service = ExpenseAdjustmentService(db)

    try:
        adjustment = await service.revert_expense_payment(
            expense_id=expense_id,
            description=revert_data.description,
            adjusted_by=current_user.id
        )

        await db.commit()

        # Build response
        response = ExpenseAdjustmentResponse.model_validate(adjustment)

        # Get account name
        if adjustment.previous_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adjustment.previous_payment_account_id
                )
            )
            response.previous_payment_account_name = result.scalar_one_or_none()

        # Get username
        result = await db.execute(
            select(User.username).where(User.id == current_user.id)
        )
        response.adjusted_by_username = result.scalar_one_or_none()

        return response

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al revertir pago: {str(e)}"
        )


@router.post(
    "/expenses/{expense_id}/refund",
    response_model=ExpenseAdjustmentResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def partial_refund_expense(
    expense_id: UUID,
    refund_data: PartialRefundRequest,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Issue a partial refund on an expense payment.

    Use this when part of the expense payment needs to be returned,
    but not the full amount.

    Args:
        expense_id: The expense UUID
        refund_data: The refund amount and description

    Returns:
        ExpenseAdjustmentResponse with refund details
    """
    from app.services.expense_adjustment import ExpenseAdjustmentService
    from app.models.user import User

    service = ExpenseAdjustmentService(db)

    try:
        adjustment = await service.partial_refund(
            expense_id=expense_id,
            refund_amount=refund_data.refund_amount,
            description=refund_data.description,
            adjusted_by=current_user.id
        )

        await db.commit()

        # Build response
        response = ExpenseAdjustmentResponse.model_validate(adjustment)

        # Get account name
        if adjustment.previous_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adjustment.previous_payment_account_id
                )
            )
            response.previous_payment_account_name = result.scalar_one_or_none()

        if adjustment.new_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adjustment.new_payment_account_id
                )
            )
            response.new_payment_account_name = result.scalar_one_or_none()

        # Get username
        result = await db.execute(
            select(User.username).where(User.id == current_user.id)
        )
        response.adjusted_by_username = result.scalar_one_or_none()

        return response

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar reembolso: {str(e)}"
        )


@router.get(
    "/expenses/{expense_id}/adjustments",
    response_model=ExpenseAdjustmentHistoryResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def get_expense_adjustment_history(
    expense_id: UUID,
    db: DatabaseSession
):
    """
    Get the adjustment history for a specific expense.

    Returns the expense details along with all adjustments made,
    ordered by most recent first.

    Args:
        expense_id: The expense UUID

    Returns:
        ExpenseAdjustmentHistoryResponse with expense and adjustment details
    """
    from app.services.expense_adjustment import ExpenseAdjustmentService
    from app.models.user import User

    service = ExpenseAdjustmentService(db)

    # Get expense
    expense = await service.get_expense_by_id(expense_id, include_adjustments=True)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gasto no encontrado"
        )

    # Get adjustments
    adjustments = await service.get_adjustment_history(expense_id)

    # Build adjustment responses with account names
    adjustment_responses = []
    for adj in adjustments:
        adj_response = ExpenseAdjustmentResponse.model_validate(adj)

        # Get account names
        if adj.previous_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adj.previous_payment_account_id
                )
            )
            adj_response.previous_payment_account_name = result.scalar_one_or_none()

        if adj.new_payment_account_id:
            result = await db.execute(
                select(BalanceAccount.name).where(
                    BalanceAccount.id == adj.new_payment_account_id
                )
            )
            adj_response.new_payment_account_name = result.scalar_one_or_none()

        # Get username
        if adj.adjusted_by:
            result = await db.execute(
                select(User.username).where(User.id == adj.adjusted_by)
            )
            adj_response.adjusted_by_username = result.scalar_one_or_none()

        adjustment_responses.append(adj_response)

    return ExpenseAdjustmentHistoryResponse(
        expense_id=expense.id,
        expense_description=expense.description,
        expense_category=expense.category,
        expense_vendor=expense.vendor,
        current_amount=expense.amount,
        current_amount_paid=expense.amount_paid,
        current_is_paid=expense.is_paid,
        adjustments=adjustment_responses,
        total_adjustments=len(adjustment_responses)
    )


@router.get(
    "/adjustments",
    response_model=AdjustmentListPaginatedResponse,
    dependencies=[Depends(require_any_school_admin)]
)
async def list_expense_adjustments(
    db: DatabaseSession,
    start_date: date = Query(..., description="Start date (inclusive)"),
    end_date: date = Query(..., description="End date (inclusive)"),
    reason: AdjustmentReason | None = Query(None, description="Filter by reason"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List expense adjustments within a date range.

    Use this for audit reports and tracking adjustments over time.

    Args:
        start_date: Start date for filtering
        end_date: End date for filtering
        reason: Optional filter by adjustment reason
        limit: Maximum records per page
        offset: Records to skip

    Returns:
        Paginated list of adjustments
    """
    from app.services.expense_adjustment import ExpenseAdjustmentService
    from app.models.user import User

    service = ExpenseAdjustmentService(db)

    adjustments, total = await service.get_adjustments_by_date_range(
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        limit=limit,
        offset=offset
    )

    # Build list responses
    items = []
    for adj in adjustments:
        # Get expense description
        expense_result = await db.execute(
            select(Expense.description).where(Expense.id == adj.expense_id)
        )
        expense_description = expense_result.scalar_one_or_none()

        # Get username
        adjusted_by_username = None
        if adj.adjusted_by:
            user_result = await db.execute(
                select(User.username).where(User.id == adj.adjusted_by)
            )
            adjusted_by_username = user_result.scalar_one_or_none()

        items.append(ExpenseAdjustmentListResponse(
            id=adj.id,
            expense_id=adj.expense_id,
            expense_description=expense_description,
            reason=adj.reason,
            description=adj.description,
            previous_amount_paid=adj.previous_amount_paid,
            new_amount_paid=adj.new_amount_paid,
            adjustment_delta=adj.adjustment_delta,
            adjusted_by_username=adjusted_by_username,
            adjusted_at=adj.adjusted_at
        ))

    return AdjustmentListPaginatedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )
