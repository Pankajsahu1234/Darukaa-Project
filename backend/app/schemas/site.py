import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class GeoJSONPolygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]] = Field(
        ...,
        description="List of linear rings. First ring is exterior boundary [[lng, lat], ...]",
    )


class SiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    site_type: Literal["carbon", "biodiversity"] = "carbon"


class SiteCreate(SiteBase):
    project_id: uuid.UUID
    geometry: GeoJSONPolygon


class SiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    site_type: Optional[Literal["carbon", "biodiversity"]] = None
    geometry: Optional[GeoJSONPolygon] = None


class SiteOut(SiteBase):
    id: uuid.UUID
    project_id: uuid.UUID
    area_hectares: float
    geometry: GeoJSONPolygon
    created_at: datetime
    project_name: Optional[str] = None
    latest_metrics: Dict[str, float] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class SiteGeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: str
    geometry: GeoJSONPolygon
    properties: Dict[str, Any]


class SiteFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[SiteGeoJSONFeature]
