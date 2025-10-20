"""
Sales Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.schemas.sale import (
    SaleCreate, SaleResponse, SaleWithItems, SaleListResponse
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
        sale = await sale_service.create_sale(sale_data)
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
    sale_service = SaleService(db)
    sales = await sale_service.get_multi(
        school_id=school_id,
        skip=skip,
        limit=limit
    )

    # Convert to list response (simplified)
    return [
        SaleListResponse(
            id=sale.id,
            code=sale.code,
            status=sale.status,
            payment_method=sale.payment_method,
            total=sale.total,
            client_name=None,  # TODO: Join with client
            created_at=sale.created_at,
            items_count=0  # TODO: Count items
        )
        for sale in sales
    ]


@router.get(
    "/{sale_id}",
    response_model=SaleWithItems,
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def get_sale(
    school_id: UUID,
    sale_id: UUID,
    db: DatabaseSession
):
    """Get sale with items"""
    sale_service = SaleService(db)
    sale = await sale_service.get_sale_with_items(sale_id, school_id)

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )

    # TODO: Convert to SaleWithItems properly with product details
    return SaleResponse.model_validate(sale)
