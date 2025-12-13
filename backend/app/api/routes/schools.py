"""
School Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query

from app.api.dependencies import DatabaseSession, CurrentSuperuser
from app.schemas.school import (
    SchoolCreate,
    SchoolUpdate,
    SchoolResponse,
    SchoolListResponse,
    SchoolSummary
)
from app.services.school import SchoolService


router = APIRouter(prefix="/schools", tags=["Schools"])


@router.post("", response_model=SchoolResponse, status_code=status.HTTP_201_CREATED)
async def create_school(
    school_data: SchoolCreate,
    db: DatabaseSession,
    _: CurrentSuperuser  # Only superusers can create schools
):
    """
    Create a new school (superuser only)
    """
    school_service = SchoolService(db)

    try:
        school = await school_service.create_school(school_data)
        await db.commit()
        return SchoolResponse.model_validate(school)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=list[SchoolListResponse])
async def list_schools(
    db: DatabaseSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    active_only: bool = Query(True)
):
    """
    List all schools with pagination
    """
    school_service = SchoolService(db)

    if active_only:
        schools = await school_service.get_active_schools(skip=skip, limit=limit)
    else:
        schools = await school_service.get_multi(skip=skip, limit=limit)

    return [SchoolListResponse.model_validate(s) for s in schools]


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: UUID,
    db: DatabaseSession
):
    """
    Get school by ID
    """
    school_service = SchoolService(db)
    school = await school_service.get(school_id)

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    return SchoolResponse.model_validate(school)


@router.get("/{school_id}/summary", response_model=SchoolSummary)
async def get_school_summary(
    school_id: UUID,
    db: DatabaseSession
):
    """
    Get school with statistics
    """
    school_service = SchoolService(db)
    summary = await school_service.get_school_summary(school_id)

    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    return summary


@router.get("/slug/{slug}", response_model=SchoolResponse)
async def get_school_by_slug(
    slug: str,
    db: DatabaseSession
):
    """
    Get school by slug (URL-friendly identifier)
    Public endpoint - no authentication required
    """
    school_service = SchoolService(db)
    school = await school_service.get_by_slug(slug)

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School with slug '{slug}' not found"
        )

    return SchoolResponse.model_validate(school)


@router.put("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: UUID,
    school_data: SchoolUpdate,
    db: DatabaseSession,
    _: CurrentSuperuser  # Only superusers can update schools
):
    """
    Update school information (superuser only)
    """
    school_service = SchoolService(db)
    school = await school_service.update_school(school_id, school_data)

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    await db.commit()
    return SchoolResponse.model_validate(school)


@router.delete("/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_school(
    school_id: UUID,
    db: DatabaseSession,
    _: CurrentSuperuser  # Only superusers can delete schools
):
    """
    Deactivate school (soft delete, superuser only)
    """
    school_service = SchoolService(db)
    school = await school_service.deactivate_school(school_id)

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    await db.commit()


@router.post("/{school_id}/activate", response_model=SchoolResponse)
async def activate_school(
    school_id: UUID,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """
    Reactivate a deactivated school (superuser only)
    """
    school_service = SchoolService(db)
    school = await school_service.activate_school(school_id)

    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )

    await db.commit()
    return SchoolResponse.model_validate(school)


@router.get("/search/by-name", response_model=list[SchoolListResponse])
async def search_schools_by_name(
    name: str = Query(..., min_length=1),
    db: DatabaseSession = None,
    limit: int = Query(10, ge=1, le=50)
):
    """
    Search schools by name (partial match)
    """
    school_service = SchoolService(db)
    schools = await school_service.search_by_name(name, limit=limit)

    return [SchoolListResponse.model_validate(s) for s in schools]
