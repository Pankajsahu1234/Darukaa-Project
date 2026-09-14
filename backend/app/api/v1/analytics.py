import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsRecordCreate,
    AnalyticsRecordOut,
    SiteAnalyticsSummary,
    TimeSeriesPoint,
)
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & Time-Series"])


@router.post(
    "/records",
    response_model=AnalyticsRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record a metric data point for a site",
)
async def record_metric(
    record_in: AnalyticsRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new observation data point for a site (e.g. carbon sequestered, biodiversity score)."""
    return await analytics_service.create_record(db, record_in)


@router.get(
    "/sites/{site_id}/summary",
    response_model=SiteAnalyticsSummary,
    summary="Get complete analytics cockpit data for a site",
)
async def get_site_analytics_summary(
    site_id: uuid.UUID,
    start_date: Optional[datetime] = Query(
        None, description="Start timestamp filter (ISO 8601)"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End timestamp filter (ISO 8601)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve summarized statistics, latest values, and full time-series for a site."""
    return await analytics_service.get_site_analytics_summary(
        db, site_id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/sites/{site_id}/time-series",
    response_model=List[TimeSeriesPoint],
    summary="Get time-series records for Chart.js plotting",
)
async def get_site_time_series(
    site_id: uuid.UUID,
    metric_name: Optional[str] = Query(
        None,
        description="Filter by specific metric name (e.g., carbon_sequestered_tons, biodiversity_index)",
    ),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve chronological points for a specific metric for charting."""
    return await analytics_service.get_site_time_series(
        db,
        site_id,
        metric_name=metric_name,
        start_date=start_date,
        end_date=end_date,
    )
