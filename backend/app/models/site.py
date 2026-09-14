# [Refactor iteration 3] Enhanced module implementation
import uuid
from datetime import datetime, timezone
from typing import Any

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKTElement
from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.db.base import Base


class GeoPolygon(TypeDecorator):
    """Geospatial polygon type: Native PostGIS Polygon in PostgreSQL, Text/WKT in SQLite."""

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                Geometry(
                    geometry_type="POLYGON",
                    srid=4326,
                    spatial_index=True,
                )
            )
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return value
        if dialect.name == "postgresql":
            if isinstance(value, str):
                return WKTElement(value, srid=4326)
            return value
        # Dialects without native PostGIS (e.g. SQLite tests)
        if hasattr(value, "data"):
            return str(value.data)
        if hasattr(value, "wkt"):
            return str(value.wkt)
        return str(value)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        return value


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    site_type: Mapped[str] = mapped_column(
        String(50), default="carbon", nullable=False, index=True
    )  # 'carbon' or 'biodiversity'

    # PostGIS Polygon Geometry with SRID 4326 and GIST spatial index
    geom = mapped_column(
        GeoPolygon(),
        nullable=False,
    )

    area_hectares: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project = relationship("Project", back_populates="sites")
    analytics_records = relationship(
        "AnalyticsRecord",
        back_populates="site",
        cascade="all, delete-orphan",
        order_by="AnalyticsRecord.recorded_at",
    )
