"""
Orders (Encargos) Endpoints

Two types of endpoints:
1. Multi-school: /orders - Lists data from ALL schools user has access to
2. School-specific: /schools/{school_id}/orders - Original endpoints for specific school
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload, joinedload

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access, UserSchoolIds
from app.models.user import UserRole
from app.models.order import Order, OrderItem, OrderStatus
from app.models.client import Client
from app.models.school import School
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderPayment, OrderResponse, OrderListResponse,
    OrderWithItems, OrderItemResponse
)
from app.services.order import OrderService


# =============================================================================
# Multi-School Orders Router (lists from ALL user's schools)
# =============================================================================
router = APIRouter(tags=["Orders"])


@router.get(
    "/orders",
    response_model=list[OrderListResponse],
    summary="List orders from all schools"
)
async def list_all_orders(
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    school_id: UUID | None = Query(None, description="Filter by specific school"),
    status_filter: OrderStatus | None = Query(None, alias="status", description="Filter by status"),
    search: str | None = Query(None, description="Search by code or client name")
):
    """
    List orders (encargos) from ALL schools the user has access to.

    Supports filtering by:
    - school_id: Specific school (optional)
    - status: Order status (pending, in_production, ready, delivered, cancelled)
    - search: Search in order code or client name
    """
    if not user_school_ids:
        return []

    # Build query
    query = (
        select(Order)
        .options(
            selectinload(Order.items),
            joinedload(Order.client),
            joinedload(Order.school)
        )
        .where(Order.school_id.in_(user_school_ids))
        .order_by(Order.created_at.desc())
    )

    # Apply filters
    if school_id:
        if school_id not in user_school_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this school"
            )
        query = query.where(Order.school_id == school_id)

    if status_filter:
        query = query.where(Order.status == status_filter)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Order.code.ilike(search_term),
                Order.client.has(Client.name.ilike(search_term))
            )
        )

    # Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    orders = result.unique().scalars().all()

    return [
        OrderListResponse(
            id=order.id,
            code=order.code,
            status=order.status,
            client_name=order.client.name if order.client else None,
            student_name=order.client.student_name if order.client else None,
            delivery_date=order.delivery_date,
            total=order.total,
            balance=order.balance,
            created_at=order.created_at,
            items_count=len(order.items) if order.items else 0,
            school_id=order.school_id,
            school_name=order.school.name if order.school else None
        )
        for order in orders
    ]


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order by ID (from any accessible school)"
)
async def get_order_global(
    order_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds
):
    """Get a specific order by ID from any school the user has access to."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.id == order_id,
            Order.school_id.in_(user_school_ids)
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo no encontrado"
        )

    return OrderResponse.model_validate(order)


# =============================================================================
# School-Specific Orders Router (original endpoints)
# =============================================================================
school_router = APIRouter(prefix="/schools/{school_id}/orders", tags=["Orders"])


@school_router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def create_order(
    school_id: UUID,
    order_data: OrderCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Create a new order (encargo) with items (requires SELLER role)

    Automatically:
    - Generates order code (ENC-YYYY-NNNN)
    - Validates garment types
    - Processes custom measurements
    - Calculates totals
    - Handles advance payment
    """
    # Ensure school_id matches
    order_data.school_id = school_id

    order_service = OrderService(db)

    try:
        order = await order_service.create_order(order_data, current_user.id)
        await db.commit()
        return OrderResponse.model_validate(order)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@school_router.get(
    "",
    response_model=list[OrderListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_orders_for_school(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status_filter: OrderStatus | None = Query(None, description="Filter by status")
):
    """List orders for a specific school"""
    order_service = OrderService(db)

    filters = {}
    if status_filter:
        filters["status"] = status_filter

    orders = await order_service.get_multi(
        school_id=school_id,
        skip=skip,
        limit=limit,
        filters=filters
    )

    # Convert to list response (simplified)
    return [
        OrderListResponse(
            id=order.id,
            code=order.code,
            status=order.status,
            client_name="",  # TODO: Join with client
            student_name=None,
            delivery_date=order.delivery_date,
            total=order.total,
            balance=order.balance,
            created_at=order.created_at,
            items_count=0  # TODO: Count items
        )
        for order in orders
    ]


@school_router.get(
    "/{order_id}",
    response_model=OrderWithItems,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_order_for_school(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession
):
    """Get order with items and client info for a specific school"""
    order_service = OrderService(db)
    order = await order_service.get_order_with_items(order_id, school_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Build response with client and items info
    items_response = []
    for item in order.items:
        item_dict = {
            "id": item.id,
            "order_id": item.order_id,
            "school_id": item.school_id,
            "garment_type_id": item.garment_type_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "subtotal": item.subtotal,
            "size": item.size,
            "color": item.color,
            "gender": item.gender,
            "custom_measurements": item.custom_measurements,
            "embroidery_text": item.embroidery_text,
            "notes": item.notes,
            "garment_type_name": item.garment_type.name if item.garment_type else "Unknown",
            "garment_type_category": item.garment_type.category if item.garment_type else None,
            "requires_embroidery": item.garment_type.requires_embroidery if item.garment_type else False,
            "has_custom_measurements": bool(item.custom_measurements)
        }
        items_response.append(item_dict)

    return OrderWithItems(
        id=order.id,
        school_id=order.school_id,
        code=order.code,
        client_id=order.client_id,
        status=order.status,
        delivery_date=order.delivery_date,
        notes=order.notes,
        subtotal=order.subtotal,
        tax=order.tax,
        total=order.total,
        paid_amount=order.paid_amount,
        balance=order.balance,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items_response,
        client_name=order.client.name if order.client else "Unknown",
        client_phone=order.client.phone if order.client else None,
        student_name=order.client.student_name if order.client else None
    )


@school_router.post(
    "/{order_id}/payments",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def add_order_payment(
    school_id: UUID,
    order_id: UUID,
    payment_data: OrderPayment,
    db: DatabaseSession
):
    """Add payment to order (requires SELLER role)"""
    order_service = OrderService(db)

    try:
        order = await order_service.add_payment(order_id, school_id, payment_data)

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        await db.commit()
        return OrderResponse.model_validate(order)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@school_router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def update_order_status(
    school_id: UUID,
    order_id: UUID,
    new_status: OrderStatus,
    db: DatabaseSession
):
    """Update order status (requires SELLER role)"""
    order_service = OrderService(db)

    order = await order_service.update_status(order_id, school_id, new_status)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    await db.commit()
    return OrderResponse.model_validate(order)
