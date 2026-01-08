"""
Orders (Encargos) Endpoints

Two types of endpoints:
1. Multi-school: /orders - Lists data from ALL schools user has access to
2. School-specific: /schools/{school_id}/orders - Original endpoints for specific school
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends, UploadFile, File
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload, joinedload
import os
import shutil
from pathlib import Path

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access, UserSchoolIds
from app.models.user import UserRole
from app.models.order import Order, OrderItem, OrderStatus, OrderItemStatus
from app.models.client import Client
from app.models.school import School
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderPayment, OrderResponse, OrderListResponse,
    OrderWithItems, OrderItemResponse, WebOrderResponse, OrderItemStatusUpdate,
    OrderItemWithGarment, OrderApprovalRequest
)
from app.services.order import OrderService
from app.services.receipt import ReceiptService
from app.services.email import send_order_confirmation_email
from app.models.sale import SaleSource
from fastapi.responses import HTMLResponse


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

    # Build query - include custom schools (with "+" prefix) even if user doesn't have explicit access
    # This allows admins to see orders for new schools created via web portal

    # First, get custom school IDs (schools with "+" prefix)
    custom_schools_result = await db.execute(
        select(School.id).where(School.name.like('+%'))
    )
    custom_school_ids = [row[0] for row in custom_schools_result.fetchall()]

    # Combine user's schools with custom schools
    all_accessible_school_ids = list(set(list(user_school_ids) + custom_school_ids))

    query = (
        select(Order)
        .options(
            selectinload(Order.items),
            joinedload(Order.client),
            joinedload(Order.school)
        )
        .where(Order.school_id.in_(all_accessible_school_ids))
        .order_by(Order.created_at.desc())
    )

    # Apply filters
    if school_id:
        # Check if user has access to this school (either explicitly or via custom school)
        if school_id not in all_accessible_school_ids:
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
            source=order.source,  # Include source for filtering web_portal orders
            client_name=order.client.name if order.client else None,
            student_name=order.client.student_name if order.client else None,
            delivery_date=order.delivery_date,
            total=order.total,
            balance=order.balance,
            created_at=order.created_at,
            items_count=len(order.items) if order.items else 0,
            school_id=order.school_id,
            school_name=order.school.name if order.school else None,
            # Partial delivery tracking
            items_delivered=sum(1 for item in order.items if item.item_status == OrderItemStatus.DELIVERED) if order.items else 0,
            items_total=len(order.items) if order.items else 0,
            # Payment proof
            payment_proof_url=order.payment_proof_url,
            # Delivery info
            delivery_type=order.delivery_type,
            delivery_fee=order.delivery_fee,
            delivery_address=order.delivery_address,
            delivery_neighborhood=order.delivery_neighborhood
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
    - Sends confirmation email if client has email
    """
    # Ensure school_id matches
    order_data.school_id = school_id

    order_service = OrderService(db)

    try:
        order = await order_service.create_order(order_data, current_user.id)
        await db.commit()

        # Send confirmation email automatically if client has email
        receipt_service = ReceiptService(db)
        order_with_details = await receipt_service.get_order_with_details(order.id)

        if order_with_details and order_with_details.client and order_with_details.client.email:
            try:
                school_name = order_with_details.school.name if order_with_details.school else "Uniformes Consuelo Rios"
                email_html = receipt_service.generate_order_email_html(order_with_details, school_name)
                send_order_confirmation_email(
                    email=order_with_details.client.email,
                    name=order_with_details.client.name,
                    order_code=order_with_details.code,
                    html_content=email_html
                )
            except Exception as e:
                # Log but don't fail the order creation
                print(f"Warning: Could not send order confirmation email: {e}")

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
            source=order.source,  # Include source for filtering web_portal orders
            client_name="",  # TODO: Join with client
            student_name=None,
            delivery_date=order.delivery_date,
            total=order.total,
            balance=order.balance,
            created_at=order.created_at,
            items_count=0,  # TODO: Count items
            school_id=order.school_id,
            # Delivery info
            delivery_type=order.delivery_type,
            delivery_fee=order.delivery_fee,
            delivery_address=order.delivery_address,
            delivery_neighborhood=order.delivery_neighborhood
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
            "item_status": item.item_status,
            "status_updated_at": item.status_updated_at,
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
        client_email=order.client.email if order.client else None,
        student_name=order.client.student_name if order.client else None,
        # Delivery fields
        delivery_type=order.delivery_type,
        delivery_address=order.delivery_address,
        delivery_neighborhood=order.delivery_neighborhood,
        delivery_city=order.delivery_city,
        delivery_references=order.delivery_references,
        delivery_zone_id=order.delivery_zone_id,
        delivery_fee=order.delivery_fee
    )


@school_router.get(
    "/{order_id}/receipt",
    response_class=HTMLResponse,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))],
    summary="Get order receipt HTML for printing"
)
async def get_order_receipt(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession
):
    """
    Get HTML receipt for an order (encargo), optimized for thermal printer (80mm).

    Opens in browser and triggers print dialog automatically.
    """
    receipt_service = ReceiptService(db)
    html = await receipt_service.generate_order_receipt_html(order_id)

    if not html:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo no encontrado"
        )

    return HTMLResponse(content=html)


@school_router.post(
    "/{order_id}/send-receipt",
    dependencies=[Depends(require_school_access(UserRole.SELLER))],
    summary="Send order receipt by email"
)
async def send_order_receipt_email(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession
):
    """
    Send order receipt by email to the client.

    Requires the client to have a valid email address.
    Returns success/failure status.
    """
    # Get order with details
    receipt_service = ReceiptService(db)
    order = await receipt_service.get_order_with_details(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo no encontrado"
        )

    # Check client email
    if not order.client or not order.client.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El cliente no tiene email registrado"
        )

    # Generate email HTML
    school_name = order.school.name if order.school else "Uniformes Consuelo Rios"
    email_html = receipt_service.generate_order_email_html(order, school_name)

    # Send email
    success = send_order_confirmation_email(
        email=order.client.email,
        name=order.client.name,
        order_code=order.code,
        html_content=email_html
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al enviar el email"
        )

    return {"message": f"Recibo enviado a {order.client.email}", "success": True}


@school_router.post(
    "/{order_id}/payments",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def add_order_payment(
    school_id: UUID,
    order_id: UUID,
    payment_data: OrderPayment,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Add payment to order (requires SELLER role)"""
    order_service = OrderService(db)

    try:
        order = await order_service.add_payment(order_id, school_id, payment_data, current_user.id)

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


@school_router.patch(
    "/{order_id}",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def update_order(
    school_id: UUID,
    order_id: UUID,
    order_update: OrderUpdate,
    db: DatabaseSession
):
    """Update order details (delivery_date, notes) - requires SELLER role"""
    order_service = OrderService(db)

    order = await order_service.update_order(order_id, school_id, order_update)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    await db.commit()
    return OrderResponse.model_validate(order)


@school_router.patch(
    "/{order_id}/items/{item_id}/status",
    response_model=OrderItemWithGarment,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def update_item_status(
    school_id: UUID,
    order_id: UUID,
    item_id: UUID,
    status_update: OrderItemStatusUpdate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Update individual order item status (requires SELLER role)

    This allows tracking progress of individual items within an order.
    For example: a catalog item may be ready while a yomber is still in production.

    Status transitions:
    - pending → in_production, ready, delivered, cancelled
    - in_production → ready, delivered, cancelled
    - ready → delivered, cancelled
    - delivered → (final state)
    - cancelled → (final state)

    The order status is automatically synchronized based on item statuses.
    """
    order_service = OrderService(db)

    try:
        item = await order_service.update_item_status(
            order_id=order_id,
            item_id=item_id,
            school_id=school_id,
            new_status=status_update.item_status,
            user_id=current_user.id
        )

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item no encontrado"
            )

        await db.commit()

        # Reload item with garment type for response
        item = await order_service.get_item(item_id, order_id, school_id)

        return OrderItemWithGarment(
            id=item.id,
            order_id=item.order_id,
            school_id=item.school_id,
            garment_type_id=item.garment_type_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal,
            size=item.size,
            color=item.color,
            gender=item.gender,
            custom_measurements=item.custom_measurements,
            embroidery_text=item.embroidery_text,
            notes=item.notes,
            item_status=item.item_status,
            status_updated_at=item.status_updated_at,
            garment_type_name=item.garment_type.name if item.garment_type else "Unknown",
            garment_type_category=item.garment_type.category if item.garment_type else None,
            requires_embroidery=item.garment_type.requires_embroidery if item.garment_type else False,
            has_custom_measurements=bool(item.custom_measurements)
        )

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@school_router.get(
    "/{order_id}/stock-verification",
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def verify_order_stock(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession
):
    """
    Verify stock availability for all items in an order.

    Returns detailed information about:
    - Which items can be fulfilled from current inventory
    - Which items need to be produced
    - Suggested actions for each item

    This is useful for web orders to determine if they can be
    immediately fulfilled or need production.
    """
    order_service = OrderService(db)

    try:
        verification = await order_service.verify_order_stock(order_id, school_id)
        return verification

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@school_router.post(
    "/{order_id}/approve",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def approve_order_with_stock(
    school_id: UUID,
    order_id: UUID,
    approval_request: OrderApprovalRequest,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Approve/process a web order with intelligent stock handling.

    This endpoint:
    1. Checks stock availability for each item
    2. For items WITH stock: marks as READY and decrements inventory
    3. For items WITHOUT stock: marks as IN_PRODUCTION

    Options:
    - auto_fulfill_if_stock: If true, automatically fulfill items that have stock
    - items: Override actions for specific items

    The order status is automatically updated based on item statuses:
    - All READY → Order is READY
    - Any IN_PRODUCTION → Order is IN_PRODUCTION
    """
    order_service = OrderService(db)

    try:
        # Convert item actions from request
        item_actions = None
        if approval_request.items:
            item_actions = [
                {
                    "item_id": str(item.item_id),
                    "action": item.action,
                    "product_id": str(item.product_id) if item.product_id else None,
                    "quantity_from_stock": item.quantity_from_stock
                }
                for item in approval_request.items
            ]

        order = await order_service.approve_order_with_stock(
            order_id=order_id,
            school_id=school_id,
            user_id=current_user.id,
            auto_fulfill=approval_request.auto_fulfill_if_stock,
            item_actions=item_actions
        )

        await db.commit()
        return OrderResponse.model_validate(order)

    except ValueError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# =============================================================================
# Web Portal Order Endpoints (Public - for web clients)
# =============================================================================
web_router = APIRouter(prefix="/portal/orders", tags=["Order Portal"])


@web_router.post(
    "/create",
    response_model=WebOrderResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_web_order(
    order_data: OrderCreate,
    db: DatabaseSession
):
    """
    Create order from web portal (public endpoint).

    This endpoint allows web clients to create orders without authentication.
    The client_id in the order_data should be from a registered web client.

    Automatically sends confirmation email to the client.
    """
    order_service = OrderService(db)

    try:
        # Validate that the client exists
        client_result = await db.execute(
            select(Client).where(Client.id == order_data.client_id)
        )
        client = client_result.scalar_one_or_none()

        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente no encontrado. Por favor registra tus datos primero."
            )

        # Create the order using the web-specific method
        order = await order_service.create_web_order(order_data)
        await db.commit()

        # Send confirmation email automatically
        if client.email:
            try:
                receipt_service = ReceiptService(db)
                order_with_details = await receipt_service.get_order_with_details(order.id)

                if order_with_details:
                    school_name = order_with_details.school.name if order_with_details.school else "Uniformes Consuelo Rios"
                    email_html = receipt_service.generate_order_email_html(order_with_details, school_name)
                    send_order_confirmation_email(
                        email=client.email,
                        name=client.name,
                        order_code=order.code,
                        html_content=email_html
                    )
            except Exception as e:
                # Log but don't fail the order creation
                print(f"Warning: Could not send web order confirmation email: {e}")

        return WebOrderResponse(
            id=order.id,
            code=order.code,
            status=order.status,
            total=order.total,
            created_at=order.created_at,
            message=f"¡Pedido {order.code} creado exitosamente! Te contactaremos pronto."
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@web_router.post(
    "/{order_id}/upload-payment-proof",
    summary="Upload payment proof for order"
)
async def upload_payment_proof(
    order_id: UUID,
    db: DatabaseSession,
    file: UploadFile = File(...),
    payment_notes: str = Query(None, description="Optional payment notes")
):
    """
    Upload payment proof (receipt/screenshot) for an order.

    Public endpoint - allows clients to upload their payment proof
    after creating an order.

    Accepted file types: .jpg, .jpeg, .png, .pdf
    Max file size: 5MB

    Args:
        order_id: ID of the order
        file: Payment proof file (image or PDF)
        payment_notes: Optional notes about the payment
        db: Database session

    Returns:
        dict: Success message with file URL

    Raises:
        HTTPException: 404 if order not found
        HTTPException: 400 if file type invalid or too large
    """
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf"}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Solo se aceptan: {', '.join(allowed_extensions)}"
        )

    # Check file size (5MB max)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo es muy grande. Tamaño máximo: 5MB"
        )

    # Find the order
    query = select(Order).where(Order.id == order_id)
    result = await db.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )

    # Create upload directory if it doesn't exist
    upload_dir = Path("/var/www/uniformes-system-v2/uploads/payment-proofs")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    import uuid as uuid_lib
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_filename = f"{order.code}_{timestamp}_{uuid_lib.uuid4().hex[:8]}{file_ext}"
    file_path = upload_dir / unique_filename

    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {str(e)}"
        )

    # Update order with payment proof URL
    file_url = f"/uploads/payment-proofs/{unique_filename}"
    order.payment_proof_url = file_url
    if payment_notes:
        order.payment_notes = payment_notes

    await db.commit()

    return {
        "message": "Comprobante de pago subido exitosamente",
        "file_url": file_url,
        "order_code": order.code
    }


# =============================================================================
# Payment Verification Endpoints (Admin - for desktop app)
# =============================================================================

@school_router.post(
    "/{order_id}/approve-payment",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))],
    summary="Approve payment proof"
)
async def approve_payment(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Approve payment proof for an order.

    Changes order status to 'in_production' after payment approval.
    Requires SELLER role.

    Args:
        school_id: School ID
        order_id: Order ID
        db: Database session
        current_user: Current authenticated user

    Returns:
        OrderResponse: Updated order with new status

    Raises:
        HTTPException: 404 if order not found
        HTTPException: 400 if no payment proof uploaded
    """
    # Find the order
    query = select(Order).where(
        Order.id == order_id,
        Order.school_id == school_id
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )

    if not order.payment_proof_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay comprobante de pago para aprobar"
        )

    # Update order status to in_production (payment approved)
    order.status = OrderStatus.IN_PRODUCTION
    order.payment_notes = (order.payment_notes or "") + f"\n[Pago aprobado por {current_user.full_name}]"

    await db.commit()
    await db.refresh(order)

    return OrderResponse.model_validate(order)


@school_router.post(
    "/{order_id}/reject-payment",
    response_model=OrderResponse,
    dependencies=[Depends(require_school_access(UserRole.SELLER))],
    summary="Reject payment proof"
)
async def reject_payment(
    school_id: UUID,
    order_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    rejection_notes: str = Query(..., description="Reason for rejection")
):
    """
    Reject payment proof for an order.

    Adds rejection notes and keeps order in pending status.
    Requires SELLER role.

    Args:
        school_id: School ID
        order_id: Order ID
        rejection_notes: Reason for rejecting the payment proof
        db: Database session
        current_user: Current authenticated user

    Returns:
        OrderResponse: Updated order with rejection notes

    Raises:
        HTTPException: 404 if order not found
        HTTPException: 400 if no payment proof uploaded
    """
    # Find the order
    query = select(Order).where(
        Order.id == order_id,
        Order.school_id == school_id
    )
    result = await db.execute(query)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido no encontrado"
        )

    if not order.payment_proof_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay comprobante de pago para rechazar"
        )

    # Add rejection notes
    rejection_msg = f"\n[Pago rechazado por {current_user.full_name}]: {rejection_notes}"
    order.payment_notes = (order.payment_notes or "") + rejection_msg

    # Clear payment proof URL so client can upload a new one
    order.payment_proof_url = None

    await db.commit()
    await db.refresh(order)

    return OrderResponse.model_validate(order)
