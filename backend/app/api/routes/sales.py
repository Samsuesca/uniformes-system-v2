"""
Sales Endpoints

Two types of endpoints:
1. Multi-school: /sales - Lists data from ALL schools user has access to
2. School-specific: /schools/{school_id}/sales - Original endpoints for specific school
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload, joinedload

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access, UserSchoolIds
from app.models.user import UserRole, User
from app.models.sale import Sale, SaleSource, SaleStatus
from app.models.client import Client
from app.models.school import School
from app.schemas.sale import (
    SaleCreate, SaleResponse, SaleWithItems, SaleListResponse,
    SaleChangeCreate, SaleChangeResponse, SaleChangeUpdate, SaleChangeListResponse
)
from app.services.sale import SaleService


# =============================================================================
# Multi-School Sales Router (lists from ALL user's schools)
# =============================================================================
router = APIRouter(tags=["Sales"])


@router.get(
    "/sales",
    response_model=list[SaleListResponse],
    summary="List sales from all schools"
)
async def list_all_sales(
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    school_id: UUID | None = Query(None, description="Filter by specific school"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    source: SaleSource | None = Query(None, description="Filter by source"),
    search: str | None = Query(None, description="Search by code or client name")
):
    """
    List sales from ALL schools the user has access to.

    Supports filtering by:
    - school_id: Specific school (optional)
    - status: Sale status (pending, completed, cancelled)
    - source: Sale source (desktop_app, web_portal, api)
    - search: Search in sale code or client name
    """
    if not user_school_ids:
        return []

    # Build query
    query = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            joinedload(Sale.client),
            joinedload(Sale.user),
            joinedload(Sale.school)
        )
        .where(Sale.school_id.in_(user_school_ids))
        .order_by(Sale.created_at.desc())
    )

    # Apply filters
    if school_id:
        if school_id not in user_school_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this school"
            )
        query = query.where(Sale.school_id == school_id)

    if status_filter:
        query = query.where(Sale.status == status_filter)

    if source:
        query = query.where(Sale.source == source)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Sale.code.ilike(search_term),
                Sale.client.has(Client.name.ilike(search_term))
            )
        )

    # Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    sales = result.unique().scalars().all()

    return [
        SaleListResponse(
            id=sale.id,
            code=sale.code,
            status=sale.status,
            source=sale.source,
            payment_method=sale.payment_method,
            total=sale.total,
            paid_amount=sale.paid_amount,
            client_id=sale.client_id,
            client_name=sale.client.name if sale.client else None,
            sale_date=sale.sale_date,
            created_at=sale.created_at,
            items_count=len(sale.items) if sale.items else 0,
            user_id=sale.user_id,
            user_name=sale.user.username if sale.user else None,
            school_id=sale.school_id,
            school_name=sale.school.name if sale.school else None
        )
        for sale in sales
    ]


@router.get(
    "/sales/{sale_id}",
    response_model=SaleResponse,
    summary="Get sale by ID (from any accessible school)"
)
async def get_sale_global(
    sale_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds
):
    """Get a specific sale by ID from any school the user has access to."""
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(
            Sale.id == sale_id,
            Sale.school_id.in_(user_school_ids)
        )
    )
    sale = result.scalar_one_or_none()

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )

    return SaleResponse.model_validate(sale)


# =============================================================================
# School-Specific Sales Router (original endpoints)
# =============================================================================
school_router = APIRouter(prefix="/schools/{school_id}/sales", tags=["Sales"])


@school_router.post(
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


@school_router.get(
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
        .options(
            selectinload(Sale.items),
            joinedload(Sale.client),
            joinedload(Sale.user)
        )
        .where(Sale.school_id == school_id)
        .order_by(Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sales = result.unique().scalars().all()

    # Convert to list response
    return [
        SaleListResponse(
            id=sale.id,
            code=sale.code,
            status=sale.status,
            source=sale.source,
            payment_method=sale.payment_method,
            total=sale.total,
            paid_amount=sale.paid_amount,
            client_id=sale.client_id,
            client_name=sale.client.name if sale.client else None,
            sale_date=sale.sale_date,
            created_at=sale.created_at,
            items_count=len(sale.items) if sale.items else 0,
            user_id=sale.user_id,
            user_name=sale.user.username if sale.user else None
        )
        for sale in sales
    ]


@school_router.get(
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


@school_router.get(
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

@school_router.post(
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


@school_router.get(
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


@school_router.patch(
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


@school_router.patch(
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
