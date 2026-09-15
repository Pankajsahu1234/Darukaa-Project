# [Refactor iteration 2] Enhanced module implementation
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.site import Site
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectWithStats


class ProjectService:
    @staticmethod
    async def list_projects(
        db: AsyncSession, current_user: Optional[User] = None
    ) -> List[ProjectWithStats]:
        """List all projects enriched with aggregate geospatial and carbon statistics."""
        stmt = (
            select(Project)
            .options(selectinload(Project.sites).selectinload(Site.analytics_records))
            .order_by(Project.created_at.desc())
        )
        result = await db.execute(stmt)
        projects = result.scalars().all()

        output = []
        for p in projects:
            sites = p.sites or []
            total_area = sum(s.area_hectares for s in sites)
            carbon_total = 0.0
            bio_scores = []

            for s in sites:
                for a in s.analytics_records:
                    if a.metric_name == "carbon_sequestered_tons":
                        carbon_total += a.value
                    elif a.metric_name == "biodiversity_index":
                        bio_scores.append(a.value)

            avg_bio = round(sum(bio_scores) / len(bio_scores), 2) if bio_scores else 0.0

            primary_type = "carbon"
            carbon_count = sum(1 for s in sites if s.site_type == "carbon")
            bio_count = sum(1 for s in sites if s.site_type == "biodiversity")
            if bio_count > carbon_count:
                primary_type = "biodiversity"

            output.append(
                ProjectWithStats(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    owner_id=p.owner_id,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                    sites_count=len(sites),
                    total_area_hectares=round(total_area, 2),
                    total_carbon_sequestered=round(carbon_total, 2),
                    biodiversity_average_score=avg_bio,
                    primary_site_type=primary_type,
                )
            )

        return output

    @staticmethod
    async def get_project(db: AsyncSession, project_id: uuid.UUID) -> ProjectWithStats:
        """Fetch single project with aggregate metrics."""
        stmt = (
            select(Project)
            .options(selectinload(Project.sites).selectinload(Site.analytics_records))
            .where(Project.id == project_id)
        )
        result = await db.execute(stmt)
        project = result.scalars().first()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        sites = project.sites or []
        total_area = sum(s.area_hectares for s in sites)
        carbon_total = 0.0
        bio_scores = []

        for s in sites:
            for a in s.analytics_records:
                if a.metric_name == "carbon_sequestered_tons":
                    carbon_total += a.value
                elif a.metric_name == "biodiversity_index":
                    bio_scores.append(a.value)

        avg_bio = round(sum(bio_scores) / len(bio_scores), 2) if bio_scores else 0.0

        return ProjectWithStats(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_id=project.owner_id,
            created_at=project.created_at,
            updated_at=project.updated_at,
            sites_count=len(sites),
            total_area_hectares=round(total_area, 2),
            total_carbon_sequestered=round(carbon_total, 2),
            biodiversity_average_score=avg_bio,
            primary_site_type="carbon",
        )

    @staticmethod
    async def create_project(
        db: AsyncSession, project_in: ProjectCreate, current_user: User
    ) -> ProjectWithStats:
        """Create a new project owned by current user."""
        project = Project(
            name=project_in.name.strip(),
            description=(
                project_in.description.strip() if project_in.description else None
            ),
            owner_id=current_user.id,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        return ProjectWithStats(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_id=project.owner_id,
            created_at=project.created_at,
            updated_at=project.updated_at,
            sites_count=0,
            total_area_hectares=0.0,
            total_carbon_sequestered=0.0,
            biodiversity_average_score=0.0,
            primary_site_type="carbon",
        )

    @staticmethod
    async def update_project(
        db: AsyncSession,
        project_id: uuid.UUID,
        project_in: ProjectUpdate,
        current_user: User,
    ) -> ProjectWithStats:
        """Update existing project details."""
        stmt = select(Project).where(Project.id == project_id)
        result = await db.execute(stmt)
        project = result.scalars().first()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        if project_in.name is not None:
            project.name = project_in.name.strip()
        if project_in.description is not None:
            project.description = project_in.description.strip()

        await db.commit()
        await db.refresh(project)
        return await ProjectService.get_project(db, project.id)

    @staticmethod
    async def delete_project(
        db: AsyncSession, project_id: uuid.UUID, current_user: User
    ) -> bool:
        """Delete project and associated sites."""
        stmt = select(Project).where(Project.id == project_id)
        result = await db.execute(stmt)
        project = result.scalars().first()

        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found.",
            )

        await db.delete(project)
        await db.commit()
        return True


project_service = ProjectService()
