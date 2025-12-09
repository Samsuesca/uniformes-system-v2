"""
Global Product Endpoints - Shared products across all schools
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_superuser
from app.schemas.product import (
    GlobalGarmentTypeCreate, GlobalGarmentTypeUpdate, GlobalGarmentTypeResponse,
    GlobalProductCreate, GlobalProductUpdate, GlobalProductResponse,
    GlobalProductWithInventory,
    GlobalInventoryCreate, GlobalInventoryUpdate, GlobalInventoryAdjust,
    GlobalInventoryResponse
)
from app.services.global_product import (
    GlobalGarmentTypeService,
    GlobalProductService,
    GlobalInventoryService
)

router = APIRouter(prefix="/global", tags=["Global Products"])


# ==========================================
# Global Garment Types
# ==========================================

@router.post(
    "/garment-types",
    response_model=GlobalGarmentTypeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superuser)]
)
async def create_global_garment_type(
    data: GlobalGarmentTypeCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Create a new global garment type (superuser only)"""
    service = GlobalGarmentTypeService(db)

    try:
        garment_type = await service.create(data)
        await db.commit()
        return GlobalGarmentTypeResponse.model_validate(garment_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/garment-types",
    response_model=list[GlobalGarmentTypeResponse]
)
async def list_global_garment_types(
    db: DatabaseSession,
    active_only: bool = Query(True)
):
    """List all global garment types"""
    service = GlobalGarmentTypeService(db)
    garment_types = await service.get_all(active_only=active_only)
    return [GlobalGarmentTypeResponse.model_validate(gt) for gt in garment_types]


@router.get(
    "/garment-types/{garment_type_id}",
    response_model=GlobalGarmentTypeResponse
)
async def get_global_garment_type(
    garment_type_id: UUID,
    db: DatabaseSession
):
    """Get global garment type by ID"""
    service = GlobalGarmentTypeService(db)
    garment_type = await service.get(garment_type_id)

    if not garment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global garment type not found"
        )

    return GlobalGarmentTypeResponse.model_validate(garment_type)


@router.put(
    "/garment-types/{garment_type_id}",
    response_model=GlobalGarmentTypeResponse,
    dependencies=[Depends(require_superuser)]
)
async def update_global_garment_type(
    garment_type_id: UUID,
    data: GlobalGarmentTypeUpdate,
    db: DatabaseSession
):
    """Update global garment type (superuser only)"""
    service = GlobalGarmentTypeService(db)
    garment_type = await service.update(garment_type_id, data)

    if not garment_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global garment type not found"
        )

    await db.commit()
    return GlobalGarmentTypeResponse.model_validate(garment_type)


# ==========================================
# Global Products
# ==========================================

@router.post(
    "/products",
    response_model=GlobalProductResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superuser)]
)
async def create_global_product(
    data: GlobalProductCreate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Create a new global product (superuser only)"""
    service = GlobalProductService(db)

    try:
        product = await service.create(data)
        await db.commit()
        return GlobalProductResponse.model_validate(product)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/products",
    response_model=list[GlobalProductWithInventory]
)
async def list_global_products(
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    with_inventory: bool = Query(True)
):
    """List all global products with inventory"""
    service = GlobalProductService(db)

    if with_inventory:
        return await service.get_with_inventory(skip=skip, limit=limit)
    else:
        products = await service.get_all(skip=skip, limit=limit)
        return [GlobalProductResponse.model_validate(p) for p in products]


@router.get(
    "/products/search",
    response_model=list[GlobalProductResponse]
)
async def search_global_products(
    q: str = Query(..., min_length=1),
    db: DatabaseSession = None,
    limit: int = Query(20, ge=1, le=50)
):
    """Search global products"""
    service = GlobalProductService(db)
    products = await service.search(q, limit=limit)
    return [GlobalProductResponse.model_validate(p) for p in products]


@router.get(
    "/products/{product_id}",
    response_model=GlobalProductResponse
)
async def get_global_product(
    product_id: UUID,
    db: DatabaseSession
):
    """Get global product by ID"""
    service = GlobalProductService(db)
    product = await service.get(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global product not found"
        )

    return GlobalProductResponse.model_validate(product)


@router.put(
    "/products/{product_id}",
    response_model=GlobalProductResponse,
    dependencies=[Depends(require_superuser)]
)
async def update_global_product(
    product_id: UUID,
    data: GlobalProductUpdate,
    db: DatabaseSession
):
    """Update global product (superuser only)"""
    service = GlobalProductService(db)
    product = await service.update(product_id, data)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Global product not found"
        )

    await db.commit()
    return GlobalProductResponse.model_validate(product)


# ==========================================
# Global Inventory
# ==========================================

@router.post(
    "/products/{product_id}/inventory",
    response_model=GlobalInventoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_superuser)]
)
async def create_global_inventory(
    product_id: UUID,
    data: GlobalInventoryCreate,
    db: DatabaseSession
):
    """Create inventory for global product (superuser only)"""
    # Ensure product_id matches
    data.product_id = product_id

    service = GlobalInventoryService(db)

    try:
        inventory = await service.create(data)
        await db.commit()
        return GlobalInventoryResponse.model_validate(inventory)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/products/{product_id}/inventory",
    response_model=GlobalInventoryResponse
)
async def get_global_inventory(
    product_id: UUID,
    db: DatabaseSession
):
    """Get inventory for global product"""
    service = GlobalInventoryService(db)
    inventory = await service.get_by_product(product_id)

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )

    return GlobalInventoryResponse.model_validate(inventory)


@router.put(
    "/products/{product_id}/inventory",
    response_model=GlobalInventoryResponse,
    dependencies=[Depends(require_superuser)]
)
async def update_global_inventory(
    product_id: UUID,
    data: GlobalInventoryUpdate,
    db: DatabaseSession
):
    """Update inventory for global product (superuser only)"""
    service = GlobalInventoryService(db)
    inventory = await service.update(product_id, data)

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found for this product"
        )

    await db.commit()
    return GlobalInventoryResponse.model_validate(inventory)


@router.post(
    "/products/{product_id}/inventory/adjust",
    response_model=GlobalInventoryResponse
)
async def adjust_global_inventory(
    product_id: UUID,
    data: GlobalInventoryAdjust,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """Adjust global inventory quantity (add or subtract)"""
    service = GlobalInventoryService(db)

    try:
        inventory = await service.adjust_quantity(product_id, data)
        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory not found for this product"
            )
        await db.commit()
        return GlobalInventoryResponse.model_validate(inventory)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/inventory/low-stock",
    response_model=list[GlobalInventoryResponse]
)
async def get_low_stock_global(
    db: DatabaseSession,
    limit: int = Query(50, ge=1, le=100)
):
    """Get global products with low stock"""
    service = GlobalInventoryService(db)
    low_stock = await service.get_low_stock(limit=limit)
    return [GlobalInventoryResponse.model_validate(inv) for inv in low_stock]
