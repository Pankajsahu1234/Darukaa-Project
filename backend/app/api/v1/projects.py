import uuid
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectWithStats
from app.services.project_service import project_service

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get(
    "/",
    response_model=List[ProjectWithStats],
    summary="List all carbon and biodiversity projects with aggregate statistics",
)
async def list_projects(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all projects with computed site counts, area in hectares, and carbon statistics."""
    return await project_service.list_projects(db)


@router.post(
    "/",
    response_model=ProjectWithStats,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project owned by the authenticated administrator."""
    return await project_service.create_project(db, project_in, current_user)


@router.get(
    "/{project_id}",
    response_model=ProjectWithStats,
    summary="Get project by ID",
)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve project metadata and aggregate metrics by unique project UUID."""
    return await project_service.get_project(db, project_id)


@router.put(
    "/{project_id}",
    response_model=ProjectWithStats,
    summary="Update project metadata",
)
async def update_project(
    project_id: uuid.UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update title and description for a project."""
    return await project_service.update_project(
        db, project_id, project_in, current_user
    )


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
)
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and cascade remove all related sites and analytics."""
    await project_service.delete_project(db, project_id, current_user)
    return None
