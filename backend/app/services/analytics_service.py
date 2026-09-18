import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsRecord
from app.models.site import Site
from app.schemas.analytics import (
    AnalyticsRecordCreate,
    AnalyticsRecordOut,
    MetricStatistic,
    SiteAnalyticsSummary,
    TimeSeriesPoint,
)


class AnalyticsService:
    @staticmethod
    async def create_record(
        db: AsyncSession, record_in: AnalyticsRecordCreate
    ) -> AnalyticsRecordOut:
        """Insert a new time-series metric record for a site."""
        site_stmt = select(Site).where(Site.id == record_in.site_id)
        site_res = await db.execute(site_stmt)
        if not site_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID '{record_in.site_id}' does not exist.",
            )

        record = AnalyticsRecord(
            site_id=record_in.site_id,
            metric_name=record_in.metric_name.strip(),
            value=record_in.value,
            recorded_at=record_in.recorded_at or datetime.now(timezone.utc),
            metric_metadata=record_in.metric_metadata or {},
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        return AnalyticsRecordOut.model_validate(record)

    @staticmethod
    async def get_site_time_series(
        db: AsyncSession,
        site_id: uuid.UUID,
        metric_name: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[TimeSeriesPoint]:
        """Fetch chronological time-series data points for a site."""
        stmt = (
            select(AnalyticsRecord)
            .where(AnalyticsRecord.site_id == site_id)
            .order_by(AnalyticsRecord.recorded_at.asc())
        )

        if metric_name:
            stmt = stmt.where(AnalyticsRecord.metric_name == metric_name)
        if start_date:
            stmt = stmt.where(AnalyticsRecord.recorded_at >= start_date)
        if end_date:
            stmt = stmt.where(AnalyticsRecord.recorded_at <= end_date)

        res = await db.execute(stmt)
        records = res.scalars().all()

        return [
            TimeSeriesPoint(
                recorded_at=r.recorded_at,
                value=round(r.value, 3),
                metric_name=r.metric_name,
            )
            for r in records
        ]

    @classmethod
    async def get_site_analytics_summary(
        cls,
        db: AsyncSession,
        site_id: uuid.UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> SiteAnalyticsSummary:
        """Compute comprehensive analytics summary, statistics, and time-series for a site."""
        site_stmt = select(Site).where(Site.id == site_id)
        site_res = await db.execute(site_stmt)
        site = site_res.scalars().first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID '{site_id}' not found.",
            )

        stmt = (
            select(AnalyticsRecord)
            .where(AnalyticsRecord.site_id == site_id)
            .order_by(AnalyticsRecord.recorded_at.asc())
        )
        if start_date:
            stmt = stmt.where(AnalyticsRecord.recorded_at >= start_date)
        if end_date:
            stmt = stmt.where(AnalyticsRecord.recorded_at <= end_date)

        res = await db.execute(stmt)
        records = res.scalars().all()

        # Group records by metric
        grouped: Dict[str, List[AnalyticsRecord]] = {}
        for r in records:
            grouped.setdefault(r.metric_name, []).append(r)

        statistics: Dict[str, MetricStatistic] = {}
        latest_values: Dict[str, float] = {}
        time_series: Dict[str, List[TimeSeriesPoint]] = {}

        for metric, recs in grouped.items():
            vals = [r.value for r in recs]
            pts = [
                TimeSeriesPoint(
                    recorded_at=r.recorded_at,
                    value=round(r.value, 3),
                    metric_name=metric,
                )
                for r in recs
            ]
            time_series[metric] = pts

            current_val = vals[-1] if vals else 0.0
            latest_values[metric] = round(current_val, 2)
            min_val = min(vals) if vals else 0.0
            max_val = max(vals) if vals else 0.0
            avg_val = sum(vals) / len(vals) if vals else 0.0

            # Trend calculation (split half comparison)
            trend_pct = 0.0
            if len(vals) >= 2:
                mid = len(vals) // 2
                first_half_avg = sum(vals[:mid]) / mid
                second_half_avg = sum(vals[mid:]) / (len(vals) - mid)
                if first_half_avg > 0:
                    trend_pct = (
                        (second_half_avg - first_half_avg) / first_half_avg
                    ) * 100.0

            statistics[metric] = MetricStatistic(
                current=round(current_val, 2),
                min=round(min_val, 2),
                max=round(max_val, 2),
                average=round(avg_val, 2),
                trend_percentage=round(trend_pct, 2),
            )

        return SiteAnalyticsSummary(
            site_id=site.id,
            site_name=site.name,
            site_type=site.site_type,
            area_hectares=site.area_hectares,
            metrics_available=list(grouped.keys()),
            latest_values=latest_values,
            statistics=statistics,
            time_series=time_series,
        )


analytics_service = AnalyticsService()
