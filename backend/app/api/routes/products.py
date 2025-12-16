"""
Product and GarmentType Endpoints

Two types of endpoints:
1. Multi-school: /products - Lists data from ALL schools user has access to
2. School-specific: /schools/{school_id}/products - Original endpoints for specific school
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload, joinedload

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access, UserSchoolIds
from app.models.user import UserRole
from app.models.product import Product, GarmentType, Inventory
from app.models.order import OrderItem, Order, OrderStatus, OrderItemStatus
from app.models.school import School
from app.schemas.product import (
    GarmentTypeCreate, GarmentTypeUpdate, GarmentTypeResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductWithInventory,
    ProductListResponse
)
from app.services.product import GarmentTypeService, ProductService


# =============================================================================
# Multi-School Products Router (lists from ALL user's schools)
# =============================================================================
router = APIRouter(tags=["Products"])


@router.get(
    "/products",
    response_model=list[ProductListResponse],
    summary="List products from all schools"
)
async def list_all_products(
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    school_id: UUID | None = Query(None, description="Filter by specific school"),
    garment_type_id: UUID | None = Query(None, description="Filter by garment type"),
    search: str | None = Query(None, description="Search by code or name"),
    active_only: bool = Query(True, description="Only active products"),
    with_stock: bool = Query(False, description="Include stock quantity")
):
    """
    List products from ALL schools the user has access to.

    Supports filtering by:
    - school_id: Specific school (optional)
    - garment_type_id: Specific garment type (optional)
    - search: Search in product code or name
    - active_only: Filter only active products
    - with_stock: Include current stock quantity
    """
    if not user_school_ids:
        return []

    # Build query
    query = (
        select(Product)
        .options(
            joinedload(Product.garment_type),
            joinedload(Product.school)
        )
        .where(Product.school_id.in_(user_school_ids))
        .order_by(Product.name)
    )

    # Apply filters
    if school_id:
        if school_id not in user_school_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this school"
            )
        query = query.where(Product.school_id == school_id)

    if garment_type_id:
        query = query.where(Product.garment_type_id == garment_type_id)

    if active_only:
        query = query.where(Product.is_active == True)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.code.ilike(search_term),
                Product.name.ilike(search_term)
            )
        )

    # Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    products = result.unique().scalars().all()

    # If with_stock, get inventory data
    stock_map = {}
    min_stock_map = {}
    if with_stock and products:
        product_ids = [p.id for p in products]
        inv_result = await db.execute(
            select(Inventory).where(Inventory.product_id.in_(product_ids))
        )
        for inv in inv_result.scalars().all():
            stock_map[inv.product_id] = inv.quantity
            min_stock_map[inv.product_id] = inv.min_stock_alert

    # Get pending orders information for each product
    # Match by garment_type + size + color (not product_id) because web orders
    # don't have product_id assigned until approved
    pending_orders_map = {}
    if products:
        # Only count items that are truly pending (not yet fulfilled from stock)
        # PENDING = not yet processed
        # IN_PRODUCTION = being made (no stock available)
        # READY/DELIVERED = already fulfilled, should NOT count
        pending_item_statuses = [OrderItemStatus.PENDING, OrderItemStatus.IN_PRODUCTION]

        # For each product, find matching order items by garment_type + size + color
        for product in products:
            # Build query to find matching order items in same school
            matching_query = await db.execute(
                select(
                    func.sum(OrderItem.quantity).label('total_qty'),
                    func.count(func.distinct(OrderItem.order_id)).label('order_count')
                )
                .join(Order, OrderItem.order_id == Order.id)
                .where(
                    Order.school_id == product.school_id,
                    OrderItem.garment_type_id == product.garment_type_id,
                    OrderItem.item_status.in_(pending_item_statuses),
                    # Match size (handle NULL)
                    or_(
                        OrderItem.size == product.size,
                        (OrderItem.size.is_(None)) & (product.size is None)
                    ),
                    # Match color (handle NULL)
                    or_(
                        OrderItem.color == product.color,
                        (OrderItem.color.is_(None)) & (product.color is None)
                    )
                )
            )
            row = matching_query.first()
            if row and (row.total_qty or 0) > 0:
                pending_orders_map[product.id] = {
                    'qty': int(row.total_qty or 0),
                    'count': int(row.order_count or 0)
                }

    return [
        ProductListResponse(
            id=product.id,
            code=product.code,
            name=product.name,
            size=product.size,
            color=product.color,
            gender=product.gender,
            price=product.price,
            is_active=product.is_active,
            garment_type_id=product.garment_type_id,
            garment_type_name=product.garment_type.name if product.garment_type else None,
            school_id=product.school_id,
            school_name=product.school.name if product.school else None,
            stock=stock_map.get(product.id, 0) if with_stock else None,
            min_stock=min_stock_map.get(product.id, 5) if with_stock else None,
            pending_orders_qty=pending_orders_map.get(product.id, {}).get('qty', 0),
            pending_orders_count=pending_orders_map.get(product.id, {}).get('count', 0)
        )
        for product in products
    ]


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    summary="Get product by ID (from any accessible school)"
)
async def get_product_global(
    product_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds
):
    """Get a specific product by ID from any school the user has access to."""
    result = await db.execute(
        select(Product)
        .options(joinedload(Product.garment_type))
        .where(
            Product.id == product_id,
            Product.school_id.in_(user_school_ids)
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )

    return ProductResponse.model_validate(product)


@router.get(
    "/garment-types",
    response_model=list[GarmentTypeResponse],
    summary="List garment types from all schools"
)
async def list_all_garment_types(
    db: DatabaseSession,
    current_user: CurrentUser,
    user_school_ids: UserSchoolIds,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    school_id: UUID | None = Query(None, description="Filter by specific school"),
    active_only: bool = Query(True, description="Only active garment types")
):
    """
    List garment types from ALL schools the user has access to.
    """
    if not user_school_ids:
        return []

    query = (
        select(GarmentType)
        .where(GarmentType.school_id.in_(user_school_ids))
        .order_by(GarmentType.name)
    )

    if school_id:
        if school_id not in user_school_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this school"
            )
        query = query.where(GarmentType.school_id == school_id)

    if active_only:
        query = query.where(GarmentType.is_active == True)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    garment_types = result.scalars().all()

    return [GarmentTypeResponse.model_validate(g) for g in garment_types]


# =============================================================================
# School-Specific Products Router (original endpoints)
# =============================================================================
school_router = APIRouter(prefix="/schools/{school_id}", tags=["Products"])


# ==========================================
# Garment Types
# ==========================================

@school_router.post(
    "/garment-types",
    response_model=GarmentTypeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def create_garment_type(
    school_id: UUID,
    garment_data: GarmentTypeCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Create a new garment type (requires ADMIN role)"""
    # Ensure school_id matches
    garment_data.school_id = school_id

    garment_service = GarmentTypeService(db)

    try:
        garment = await garment_service.create_garment_type(garment_data)
        await db.commit()
        return GarmentTypeResponse.model_validate(garment)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@school_router.get(
    "/garment-types",
    response_model=list[GarmentTypeResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_garment_types_for_school(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(True)
):
    """List garment types for a specific school"""
    garment_service = GarmentTypeService(db)

    if active_only:
        garments = await garment_service.get_active_garment_types(
            school_id, skip=skip, limit=limit
        )
    else:
        garments = await garment_service.get_multi(
            school_id=school_id, skip=skip, limit=limit
        )

    return [GarmentTypeResponse.model_validate(g) for g in garments]


# ==========================================
# Products
# ==========================================

@school_router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def create_product(
    school_id: UUID,
    product_data: ProductCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Create a new product (requires ADMIN role)"""
    # Ensure school_id matches
    product_data.school_id = school_id

    product_service = ProductService(db)

    try:
        product = await product_service.create_product(product_data)
        await db.commit()
        return ProductResponse.model_validate(product)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@school_router.get(
    "/products",
    response_model=list[ProductWithInventory],  # Changed to support inventory fields
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_products_for_school(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    active_only: bool = Query(True),
    with_inventory: bool = Query(False)
):
    """List products for school"""
    product_service = ProductService(db)

    if with_inventory:
        products = await product_service.get_products_with_inventory(
            school_id, skip=skip, limit=limit
        )
        return products
    else:
        if active_only:
            products = await product_service.get_active_products(
                school_id, skip=skip, limit=limit
            )
        else:
            products = await product_service.get_multi(
                school_id=school_id, skip=skip, limit=limit
            )

        return [ProductResponse.model_validate(p) for p in products]


@school_router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_product_for_school(
    school_id: UUID,
    product_id: UUID,
    db: DatabaseSession
):
    """Get product by ID for a specific school"""
    product_service = ProductService(db)
    product = await product_service.get(product_id, school_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    return ProductResponse.model_validate(product)


@school_router.put(
    "/products/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_school_access(UserRole.ADMIN))]
)
async def update_product(
    school_id: UUID,
    product_id: UUID,
    product_data: ProductUpdate,
    db: DatabaseSession
):
    """Update product (requires ADMIN role)"""
    product_service = ProductService(db)
    product = await product_service.update_product(
        product_id, school_id, product_data
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    await db.commit()
    return ProductResponse.model_validate(product)


@school_router.get(
    "/products/search/by-term",
    response_model=list[ProductResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def search_products(
    school_id: UUID,
    q: str = Query(..., min_length=1, description="Search term"),
    db: DatabaseSession = None,
    limit: int = Query(20, ge=1, le=50)
):
    """Search products by code, name, size, or color"""
    product_service = ProductService(db)
    products = await product_service.search_products(
        school_id, q, limit=limit
    )

    return [ProductResponse.model_validate(p) for p in products]
