"""
Client Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, require_school_access
from app.models.user import UserRole
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse, ClientSummary
)
from app.services.client import ClientService


router = APIRouter(prefix="/schools/{school_id}/clients", tags=["Clients"])


@router.post(
    "",
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_school_access(UserRole.SELLER))]
)
async def create_client(
    school_id: UUID,
    client_data: ClientCreate,
    db: DatabaseSession
):
    """Create a new client (requires SELLER role)"""
    client_data.school_id = school_id

    client_service = ClientService(db)

    try:
        client = await client_service.create_client(client_data)
        await db.commit()
        return ClientResponse.model_validate(client)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "",
    response_model=list[ClientListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def list_clients(
    school_id: UUID,
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List clients for school"""
    client_service = ClientService(db)
    clients = await client_service.get_active_clients(
        school_id, skip=skip, limit=limit
    )

    return [ClientListResponse.model_validate(c) for c in clients]


@router.get(
    "/search",
    response_model=list[ClientListResponse],
    dependencies=[Depends(require_school_access(UserRole.VIEWER))]
)
async def search_clients(
    school_id: UUID,
    q: str = Query(..., min_length=1),
    db: DatabaseSession = None,
    limit: int = Query(20, ge=1, le=50)
):
    """Search clients"""
    client_service = ClientService(db)
    clients = await client_service.search_clients(school_id, q, limit=limit)

    return [ClientListResponse.model_validate(c) for c in clients]
