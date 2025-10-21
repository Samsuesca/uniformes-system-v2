"""
Sales Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.models.sale import Sale
from app.schemas.sale import (
    SaleCreate, SaleResponse, SaleWithItems, SaleListResponse,
    SaleChangeCreate, SaleChangeResponse, SaleChangeUpdate, SaleChangeListResponse
)
from app.services.sale import SaleService


router = APIRouter(prefix="/schools/{school_id}/sales", tags=["Sales"])


@router.post(
    "",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def create_sale(
    school_id: UUID,
    sale_data: SaleCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a new sale with items (requires SELLER role)

    Automatically:
    - Generates sale code (VNT-YYYY-NNNN)
    - Validates product availability
    - Reserves inventory
    - Calculates totals (subtotal, tax, total)
    """
    # Ensure school_id matches
    sale_data.school_id = school_id

    sale_service = SaleService(db)

    try:
        sale = await sale_service.create_sale(sale_data, user_id=current_user.id)
        await db.commit()
        return SaleResponse.model_validate(sale)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "",
    response_model=list[SaleListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_sales(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List sales for school"""
    # Get sales with items count
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.school_id == school_id)
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sales = result.scalars().all()

    # Convert to list response
    return [
        SaleListResponse(
            id=sale.id,
            code=sale.code,
            status=sale.status,
            payment_method=sale.payment_method,
            total=sale.total,
            paid_amount=sale.paid_amount,
            client_id=sale.client_id,
            client_name=None,  # TODO: Join with client
            sale_date=sale.sale_date,
            created_at=sale.created_at,
            items_count=len(sale.items) if sale.items else 0
        )
        for sale in sales
    ]


@router.get(
    "/{sale_id}",
    response_model=SaleResponse,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_sale(
    school_id: UUID,
    sale_id: UUID,
    db: DatabaseSession
):
    """Get sale by ID"""
    sale_service = SaleService(db)
    sale = await sale_service.get(sale_id, school_id)

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )

    return SaleResponse.model_validate(sale)


@router.get(
    "/{sale_id}/items",
    response_model=SaleResponse,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_sale_with_items(
    school_id: UUID,
    sale_id: UUID,
    db: DatabaseSession
):
    """Get sale with all items"""
    sale_service = SaleService(db)
    sale = await sale_service.get_sale_with_items(sale_id, school_id)

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )

    return SaleResponse.model_validate(sale)


# ============================================
# Sale Changes Endpoints
# ============================================

@router.post(
    "/{sale_id}/changes",
    response_model=SaleChangeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def create_sale_change(
    school_id: UUID,
    sale_id: UUID,
    change_data: SaleChangeCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a sale change request (size change, product change, return, defect)

    Requires SELLER role. The change will be created in PENDING status.

    Types of changes:
    - size_change: Change product size (e.g., T14 → T16)
    - product_change: Change to different product
    - return: Return product without replacement (refund)
    - defect: Change due to defective product

    The system will:
    - Validate stock availability for new product
    - Calculate price adjustment automatically
    - Create change request in PENDING status
    """
    sale_service = SaleService(db)

    try:
        change = await sale_service.create_sale_change(
            sale_id=sale_id,
            school_id=school_id,
            user_id=current_user.id,
            change_data=change_data
        )
        await db.commit()
        return SaleChangeResponse.model_validate(change)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{sale_id}/changes",
    response_model=list[SaleChangeListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_sale_changes(
    school_id: UUID,
    sale_id: UUID,
    db: DatabaseSession
):
    """
    Get all change requests for a sale

    Returns list of all changes (pending, approved, rejected) ordered by creation date.
    """
    sale_service = SaleService(db)

    try:
        changes = await sale_service.get_sale_changes(sale_id, school_id)

        # TODO: Add sale_code to response by joining with sale
        return [
            SaleChangeListResponse(
                id=change.id,
                sale_id=change.sale_id,
                sale_code="",  # TODO: Get from joined sale
                change_type=change.change_type,
                status=change.status,
                returned_quantity=change.returned_quantity,
                new_quantity=change.new_quantity,
                price_adjustment=change.price_adjustment,
                change_date=change.change_date,
                reason=change.reason
            )
            for change in changes
        ]

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.patch(
    "/{sale_id}/changes/{change_id}/approve",
    response_model=SaleChangeResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def approve_sale_change(
    school_id: UUID,
    sale_id: UUID,
    change_id: UUID,
    db: DatabaseSession
):
    """
    Approve a sale change request (requires ADMIN role)

    This will:
    1. Return original product to inventory (+1)
    2. Deduct new product from inventory (-1) if applicable
    3. Update change status to APPROVED
    4. Record inventory adjustments with notes

    Once approved, inventory changes are permanent.
    """
    sale_service = SaleService(db)

    try:
        change = await sale_service.approve_sale_change(change_id, school_id)
        await db.commit()
        return SaleChangeResponse.model_validate(change)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch(
    "/{sale_id}/changes/{change_id}/reject",
    response_model=SaleChangeResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def reject_sale_change(
    school_id: UUID,
    sale_id: UUID,
    change_id: UUID,
    update_data: SaleChangeUpdate,
    db: DatabaseSession
):
    """
    Reject a sale change request (requires ADMIN role)

    No inventory adjustments will be made.
    Rejection reason is required.
    """
    sale_service = SaleService(db)

    if not update_data.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required"
        )

    try:
        change = await sale_service.reject_sale_change(
            change_id,
            school_id,
            update_data.rejection_reason
        )
        await db.commit()
        return SaleChangeResponse.model_validate(change)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
