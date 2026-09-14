# [Refactor iteration 3] Enhanced module implementation
import json
import math
import uuid
from typing import Any, List, Optional

from fastapi import HTTPException, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from shapely.geometry import Polygon, mapping
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.site import Site
from app.schemas.site import (
    GeoJSONPolygon,
    SiteCreate,
    SiteFeatureCollection,
    SiteGeoJSONFeature,
    SiteOut,
)


def calculate_spherical_polygon_area_hectares(coordinates: List[List[float]]) -> float:
    """Calculate geodesic area of a polygon on WGS84 sphere in hectares.

    Formula: Uses spherical excess across linear ring vertices.
    Radius of Earth: 6378137 meters.
    1 Hectare = 10,000 square meters.
    """
    if len(coordinates) < 3:
        return 0.0

    total_rad = 0.0
    rad_conv = math.pi / 180.0
    r = 6378137.0  # Earth radius in meters

    for i in range(len(coordinates)):
        p1 = coordinates[i]
        p2 = coordinates[(i + 1) % len(coordinates)]

        lon1 = p1[0] * rad_conv
        lat1 = p1[1] * rad_conv
        lon2 = p2[0] * rad_conv
        lat2 = p2[1] * rad_conv

        total_rad += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2))

    area_sq_m = abs(total_rad * (r * r) / 2.0)
    area_hectares = area_sq_m / 10000.0
    return round(area_hectares, 2)


class SiteService:
    @staticmethod
    def _extract_geojson_from_geom(geom_attr: Any) -> GeoJSONPolygon:
        """Convert geometry attribute (WKB/WKT/Shape) to GeoJSONPolygon."""
        try:
            from shapely import wkt

            if hasattr(geom_attr, "data"):
                shapely_geom = to_shape(geom_attr)
                geo_dict = mapping(shapely_geom)
                return GeoJSONPolygon(
                    type="Polygon", coordinates=geo_dict["coordinates"]
                )
            elif isinstance(geom_attr, str):
                cleaned = geom_attr.strip()
                if cleaned.upper().startswith("POLYGON"):
                    shapely_geom = wkt.loads(cleaned)
                    geo_dict = mapping(shapely_geom)
                    return GeoJSONPolygon(
                        type="Polygon", coordinates=geo_dict["coordinates"]
                    )
                elif "POLYGON" in cleaned.upper() and ";" in cleaned:
                    # e.g. SRID=4326;POLYGON(...)
                    wkt_part = cleaned.split(";", 1)[1]
                    shapely_geom = wkt.loads(wkt_part)
                    geo_dict = mapping(shapely_geom)
                    return GeoJSONPolygon(
                        type="Polygon", coordinates=geo_dict["coordinates"]
                    )
                else:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict) and "coordinates" in parsed:
                        return GeoJSONPolygon(
                            type="Polygon", coordinates=parsed["coordinates"]
                        )
            elif hasattr(geom_attr, "geom_type") and geom_attr.geom_type == "Polygon":
                geo_dict = mapping(geom_attr)
                return GeoJSONPolygon(
                    type="Polygon", coordinates=geo_dict["coordinates"]
                )
        except Exception:
            pass

        # Fallback empty polygon if extraction fails
        return GeoJSONPolygon(type="Polygon", coordinates=[[]])

    @classmethod
    async def create_site(cls, db: AsyncSession, site_in: SiteCreate) -> SiteOut:
        """Validate polygon geometry, compute area in hectares, and save site."""
        # Verify parent project exists
        proj_stmt = select(Project).where(Project.id == site_in.project_id)
        proj_res = await db.execute(proj_stmt)
        project = proj_res.scalars().first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{site_in.project_id}' does not exist.",
            )

        # Validate GeoJSON structure with Shapely
        coords = site_in.geometry.coordinates
        if not coords or len(coords) < 1 or len(coords[0]) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid polygon: Exterior ring must have at least 4 coordinate points and be closed.",
            )

        try:
            exterior_ring = coords[0]
            # Ensure ring is closed
            if exterior_ring[0] != exterior_ring[-1]:
                exterior_ring.append(exterior_ring[0])
            poly = Polygon(exterior_ring)
            if not poly.is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Polygon geometry is invalid (self-intersecting or degenerate).",
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Polygon geometry error: {str(e)}",
            )

        # Calculate area in hectares
        area_ha = calculate_spherical_polygon_area_hectares(exterior_ring)

        # Build GeoAlchemy2 WKTElement or shape
        geo_wkt = poly.wkt
        geom_element = WKTElement(geo_wkt, srid=4326)

        db_site = Site(
            project_id=site_in.project_id,
            name=site_in.name.strip(),
            site_type=site_in.site_type,
            geom=geom_element,
            area_hectares=area_ha,
        )

        db.add(db_site)
        await db.commit()
        await db.refresh(db_site)

        return SiteOut(
            id=db_site.id,
            project_id=db_site.project_id,
            name=db_site.name,
            site_type=db_site.site_type,
            area_hectares=db_site.area_hectares,
            geometry=site_in.geometry,
            created_at=db_site.created_at,
            project_name=project.name,
            latest_metrics={},
        )

    @classmethod
    async def get_site(cls, db: AsyncSession, site_id: uuid.UUID) -> SiteOut:
        """Fetch single site with project details and latest metrics."""
        stmt = (
            select(Site)
            .options(
                selectinload(Site.project),
                selectinload(Site.analytics_records),
            )
            .where(Site.id == site_id)
        )
        res = await db.execute(stmt)
        site = res.scalars().first()

        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID '{site_id}' not found.",
            )

        geojson_geom = cls._extract_geojson_from_geom(site.geom)

        # Get latest value per metric
        latest_metrics = {}
        for r in sorted(site.analytics_records, key=lambda x: x.recorded_at):
            latest_metrics[r.metric_name] = r.value

        return SiteOut(
            id=site.id,
            project_id=site.project_id,
            name=site.name,
            site_type=site.site_type,
            area_hectares=site.area_hectares,
            geometry=geojson_geom,
            created_at=site.created_at,
            project_name=site.project.name if site.project else None,
            latest_metrics=latest_metrics,
        )

    @classmethod
    async def list_sites(
        cls,
        db: AsyncSession,
        project_id: Optional[uuid.UUID] = None,
        site_type: Optional[str] = None,
    ) -> List[SiteOut]:
        """List sites with filtering options."""
        stmt = select(Site).options(
            selectinload(Site.project),
            selectinload(Site.analytics_records),
        )

        if project_id:
            stmt = stmt.where(Site.project_id == project_id)
        if site_type:
            stmt = stmt.where(Site.site_type == site_type)

        stmt = stmt.order_by(Site.created_at.desc())
        res = await db.execute(stmt)
        sites = res.scalars().all()

        output = []
        for s in sites:
            latest_metrics = {}
            for r in sorted(s.analytics_records, key=lambda x: x.recorded_at):
                latest_metrics[r.metric_name] = r.value

            output.append(
                SiteOut(
                    id=s.id,
                    project_id=s.project_id,
                    name=s.name,
                    site_type=s.site_type,
                    area_hectares=s.area_hectares,
                    geometry=cls._extract_geojson_from_geom(s.geom),
                    created_at=s.created_at,
                    project_name=s.project.name if s.project else None,
                    latest_metrics=latest_metrics,
                )
            )
        return output

    @classmethod
    async def get_feature_collection(
        cls,
        db: AsyncSession,
        project_id: Optional[uuid.UUID] = None,
    ) -> SiteFeatureCollection:
        """Produce standard GeoJSON FeatureCollection for Mapbox GL JS rendering."""
        sites = await cls.list_sites(db, project_id=project_id)
        features = []

        for site in sites:
            features.append(
                SiteGeoJSONFeature(
                    type="Feature",
                    id=str(site.id),
                    geometry=site.geometry,
                    properties={
                        "id": str(site.id),
                        "name": site.name,
                        "site_type": site.site_type,
                        "area_hectares": site.area_hectares,
                        "project_id": str(site.project_id),
                        "project_name": site.project_name,
                        "latest_metrics": site.latest_metrics,
                    },
                )
            )

        return SiteFeatureCollection(type="FeatureCollection", features=features)

    @classmethod
    async def delete_site(cls, db: AsyncSession, site_id: uuid.UUID) -> bool:
        """Delete a site and its cascading records."""
        stmt = select(Site).where(Site.id == site_id)
        res = await db.execute(stmt)
        site = res.scalars().first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID '{site_id}' not found.",
            )

        await db.delete(site)
        await db.commit()
        return True


site_service = SiteService()
