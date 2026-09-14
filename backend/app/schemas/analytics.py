import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsRecordBase(BaseModel):
    metric_name: str
    value: float
    recorded_at: Optional[datetime] = None
    metric_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AnalyticsRecordCreate(AnalyticsRecordBase):
    site_id: uuid.UUID


class AnalyticsRecordOut(AnalyticsRecordBase):
    id: uuid.UUID
    site_id: uuid.UUID
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimeSeriesPoint(BaseModel):
    recorded_at: datetime
    value: float
    metric_name: str


class MetricStatistic(BaseModel):
    current: float
    min: float
    max: float
    average: float
    trend_percentage: float  # comparison against previous period


class SiteAnalyticsSummary(BaseModel):
    site_id: uuid.UUID
    site_name: str
    site_type: str
    area_hectares: float
    metrics_available: List[str]
    latest_values: Dict[str, float]
    statistics: Dict[str, MetricStatistic]
    time_series: Dict[str, List[TimeSeriesPoint]]
