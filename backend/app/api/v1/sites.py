import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.site import (
    SiteCreate,
    SiteFeatureCollection,
    SiteOut,
)
from app.services.site_service import site_service

router = APIRouter(prefix="/sites", tags=["Sites & Geospatial"])


@router.get(
    "/geojson",
    response_model=SiteFeatureCollection,
    summary="Get all sites formatted as a standard GeoJSON FeatureCollection",
)
async def get_geojson_feature_collection(
    project_id: Optional[uuid.UUID] = Query(
        None, description="Optional project ID filter"
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return sites as a GeoJSON FeatureCollection, directly consumable by Mapbox GL JS sources."""
    return await site_service.get_feature_collection(db, project_id=project_id)


@router.get(
    "/",
    response_model=List[SiteOut],
    summary="List all project sites",
)
async def list_sites(
    project_id: Optional[uuid.UUID] = Query(
        None, description="Filter sites by project ID"
    ),
    site_type: Optional[str] = Query(
        None, description="Filter sites by type (carbon/biodiversity)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """List sites with area calculations, polygon coordinates, and latest metrics."""
    return await site_service.list_sites(db, project_id=project_id, site_type=site_type)


@router.post(
    "/",
    response_model=SiteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new geographical site with polygon boundary",
)
async def create_site(
    site_in: SiteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new geographical site to a project.

    Accepts a GeoJSON polygon, validates geometry with Shapely, computes area in hectares,
    and indexes the geometry in PostGIS.
    """
    return await site_service.create_site(db, site_in)


@router.get(
    "/{site_id}",
    response_model=SiteOut,
    summary="Get site details by ID",
)
async def get_site(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get single site polygon geometry, computed area, and latest performance metrics."""
    return await site_service.get_site(db, site_id)


@router.delete(
    "/{site_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a site",
)
async def delete_site(
    site_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete site by ID and cascade remove its associated analytics records."""
    await site_service.delete_site(db, site_id)
    return None
