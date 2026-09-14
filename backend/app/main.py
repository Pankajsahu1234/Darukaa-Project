# [Refactor iteration 2] Enhanced module implementation
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown routines."""
    # Ensure database tables exist (useful for dev and container boots)
    try:
        async with engine.begin() as conn:
            # If PostgreSQL, enable postgis extension if permitted
            if "postgresql" in settings.DATABASE_URL:
                try:
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                except Exception:
                    pass
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(
            f"[Darukaa Backend Startup Warning] Table auto-init skipped or failed: {e}"
        )

    yield

    # Clean up engine on shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Darukaa.Earth - Geospatial Data Analytics Platform for Carbon & Biodiversity",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    tags=["System"],
    summary="Health check endpoint",
)
async def health_check():
    """Returns the operational status of the service."""
    return {
        "status": "healthy",
        "service": "Darukaa.Earth API",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }


@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    return {
        "message": "Welcome to Darukaa.Earth API. Explore interactive OpenAPI documentation at /docs",
        "docs": "/docs",
    }
