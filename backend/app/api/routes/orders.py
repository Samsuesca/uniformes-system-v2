"""
Orders (Encargos) Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.models.order import OrderStatus
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderPayment, OrderResponse, OrderListResponse,
    OrderWithItems, OrderItemResponse
)
from app.services.order import OrderService


router = APIRouter(prefix="/schools/{school_id}/orders", tags=["Orders"])


@router.post(
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


@router.get(
    "",
    response_model=list[OrderListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_orders(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status_filter: OrderStatus | None = Query(None, description="Filter by status")
):
    """List orders for school"""
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


@router.get(
    "/{order_id}",
    response_model=OrderWithItems,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_order(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession
):
    """Get order with items and client info"""
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


@router.post(
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


@router.patch(
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
