"""
Product and GarmentType Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.schemas.product import (
    GarmentTypeCreate, GarmentTypeUpdate, GarmentTypeResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductWithInventory
)
from app.services.product import GarmentTypeService, ProductService


router = APIRouter(prefix="/schools/{school_id}", tags=["Products"])


# ==========================================
# Garment Types
# ==========================================

@router.post(
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


@router.get(
    "/garment-types",
    response_model=list[GarmentTypeResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_garment_types(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(True)
):
    """List garment types for school"""
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

@router.post(
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


@router.get(
    "/products",
    response_model=list[ProductResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_products(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
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


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_product(
    school_id: UUID,
    product_id: UUID,
    db: DatabaseSession
):
    """Get product by ID"""
    product_service = ProductService(db)
    product = await product_service.get(product_id, school_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    return ProductResponse.model_validate(product)


@router.put(
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


@router.get(
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
