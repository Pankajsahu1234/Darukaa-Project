# [Refactor iteration 4] Enhanced module implementation
import asyncio
from datetime import datetime, timedelta, timezone
import json
import random
import uuid
from geoalchemy2.elements import WKTElement
from shapely.geometry import Polygon
from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import async_session_factory, engine
from app.models.analytics import AnalyticsRecord
from app.models.project import Project
from app.models.site import Site
from app.models.user import User
from app.services.site_service import calculate_spherical_polygon_area_hectares

SEED_USERS = [
    {
        "email": "admin@darukaa.earth",
        "password": "Password123!",
        "full_name": "Darukaa Administrator",
        "role": "admin",
    },
    {
        "email": "evaluator@darukaa.earth",
        "password": "Password123!",
        "full_name": "Hackathon Evaluator",
        "role": "evaluator",
    },
    {
        "email": "viewer@darukaa.earth",
        "password": "Password123!",
        "full_name": "Field Officer",
        "role": "viewer",
    },
]

SEED_PROJECTS = [
    {
        "name": "Sundarbans Blue Carbon Reserve",
        "description": "Mangrove afforestation and tidal carbon sequestration project along the Bay of Bengal delta, protecting endangered Royal Bengal tigers and enhancing coastal storm barrier resilience.",
        "sites": [
            {
                "name": "Lothian Island Mangrove Sanctuary",
                "site_type": "carbon",
                "coords": [
                    [88.305, 21.650],
                    [88.365, 21.655],
                    [88.375, 21.605],
                    [88.320, 21.595],
                    [88.305, 21.650],
                ],
                "base_carbon": 340.0,
                "base_bio": 72.0,
            },
            {
                "name": "Sajnekhali Core Ecological Zone",
                "site_type": "biodiversity",
                "coords": [
                    [88.750, 22.120],
                    [88.820, 22.135],
                    [88.840, 22.080],
                    [88.760, 22.070],
                    [88.750, 22.120],
                ],
                "base_carbon": 280.0,
                "base_bio": 86.5,
            },
            {
                "name": "Netidhopani Wetland Carbon Zone",
                "site_type": "carbon",
                "coords": [
                    [88.880, 21.920],
                    [88.940, 21.930],
                    [88.950, 21.870],
                    [88.890, 21.860],
                    [88.880, 21.920],
                ],
                "base_carbon": 410.0,
                "base_bio": 69.0,
            },
        ],
    },
    {
        "name": "Western Ghats Biodiversity Corridor",
        "description": "Montane cloud forest restoration and endemic species corridor connecting disjointed protected zones across the Western Ghats UNESCO World Heritage region.",
        "sites": [
            {
                "name": "Agasthyamalai Ridge Sanctuary",
                "site_type": "biodiversity",
                "coords": [
                    [77.220, 8.610],
                    [77.290, 8.630],
                    [77.300, 8.570],
                    [77.230, 8.560],
                    [77.220, 8.610],
                ],
                "base_carbon": 190.0,
                "base_bio": 91.0,
            },
            {
                "name": "Anamalai Elephant Buffer Zone",
                "site_type": "carbon",
                "coords": [
                    [76.920, 10.350],
                    [76.990, 10.370],
                    [77.010, 10.310],
                    [76.930, 10.290],
                    [76.920, 10.350],
                ],
                "base_carbon": 310.0,
                "base_bio": 84.0,
            },
            {
                "name": "Kudremukh Rain Corridor",
                "site_type": "biodiversity",
                "coords": [
                    [75.210, 13.220],
                    [75.280, 13.240],
                    [75.290, 13.180],
                    [75.220, 13.160],
                    [75.210, 13.220],
                ],
                "base_carbon": 220.0,
                "base_bio": 88.0,
            },
        ],
    },
    {
        "name": "Amazon Basin Agroforestry & Canopy Project",
        "description": "Indigenous-managed community agroforestry project reducing slash-and-burn pressures through high-integrity carbon credits and remote sensing canopy health verification.",
        "sites": [
            {
                "name": "Acre Rio Branco Basin Parcel",
                "site_type": "carbon",
                "coords": [
                    [-67.850, -9.920],
                    [-67.770, -9.900],
                    [-67.750, -9.960],
                    [-67.840, -9.970],
                    [-67.850, -9.920],
                ],
                "base_carbon": 520.0,
                "base_bio": 78.0,
            },
            {
                "name": "Tambopata River Canopy Reserve",
                "site_type": "biodiversity",
                "coords": [
                    [-69.250, -12.600],
                    [-69.170, -12.580],
                    [-69.160, -12.650],
                    [-69.240, -12.660],
                    [-69.250, -12.600],
                ],
                "base_carbon": 380.0,
                "base_bio": 94.5,
            },
            {
                "name": "Madre de Dios High-Density Sinks",
                "site_type": "carbon",
                "coords": [
                    [-70.150, -12.200],
                    [-70.070, -12.180],
                    [-70.050, -12.260],
                    [-70.140, -12.270],
                    [-70.150, -12.200],
                ],
                "base_carbon": 610.0,
                "base_bio": 80.0,
            },
        ],
    },
    {
        "name": "Congo Basin Peatland Conservation",
        "description": "Vital preservation of equatorial peat swamplands containing one of the most carbon-dense ecosystems on Earth alongside western lowland gorilla sanctuaries.",
        "sites": [
            {
                "name": "Lac Tumba Peatland Reserve",
                "site_type": "carbon",
                "coords": [
                    [18.010, 0.720],
                    [18.090, 0.740],
                    [18.110, 0.670],
                    [18.020, 0.650],
                    [18.010, 0.720],
                ],
                "base_carbon": 750.0,
                "base_bio": 79.0,
            },
            {
                "name": "Salonga Lowland Canopy Sanctuary",
                "site_type": "biodiversity",
                "coords": [
                    [20.820, -2.110],
                    [20.900, -2.090],
                    [20.920, -2.170],
                    [20.830, -2.180],
                    [20.820, -2.110],
                ],
                "base_carbon": 430.0,
                "base_bio": 92.0,
            },
            {
                "name": "Mai Ndombe Wetland Buffer",
                "site_type": "carbon",
                "coords": [
                    [18.320, -1.920],
                    [18.400, -1.900],
                    [18.420, -1.980],
                    [18.330, -1.990],
                    [18.320, -1.920],
                ],
                "base_carbon": 580.0,
                "base_bio": 74.0,
            },
        ],
    },
]


async def seed_database():
    """Seed database with users, conservation projects, geographical polygon sites, and 12-month analytics."""
    print("[*] [Darukaa.Earth] Commencing realistic database seeding...")

    # Ensure tables exist
    async with engine.begin() as conn:
        from app.db.base import Base
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # 1. Seed Users
        user_map = {}
        for user_data in SEED_USERS:
            stmt = select(User).where(User.email == user_data["email"])
            res = await session.execute(stmt)
            existing_user = res.scalars().first()

            if not existing_user:
                db_user = User(
                    email=user_data["email"],
                    hashed_password=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                )
                session.add(db_user)
                await session.flush()
                user_map[user_data["email"]] = db_user
                print(f"  + Created user: {user_data['email']}")
            else:
                user_map[user_data["email"]] = existing_user
                print(f"  = Found existing user: {user_data['email']}")

        admin_user = user_map["admin@darukaa.earth"]

        # 2. Seed Projects & Sites
        total_sites = 0
        total_records = 0
        now = datetime.now(timezone.utc)

        for proj_data in SEED_PROJECTS:
            stmt = select(Project).where(Project.name == proj_data["name"])
            res = await session.execute(stmt)
            project = res.scalars().first()

            if not project:
                project = Project(
                    name=proj_data["name"],
                    description=proj_data["description"],
                    owner_id=admin_user.id,
                )
                session.add(project)
                await session.flush()
                print(f"\n[Project] Created: '{project.name}'")
            else:
                print(f"\n[Project] Found: '{project.name}'")

            for site_info in proj_data["sites"]:
                site_stmt = select(Site).where(
                    Site.name == site_info["name"], Site.project_id == project.id
                )
                site_res = await session.execute(site_stmt)
                existing_site = site_res.scalars().first()

                if existing_site:
                    continue

                # Build geometry
                coords = site_info["coords"]
                poly = Polygon(coords)
                area_ha = calculate_spherical_polygon_area_hectares(coords)
                geom_element = WKTElement(poly.wkt, srid=4326)

                site = Site(
                    project_id=project.id,
                    name=site_info["name"],
                    site_type=site_info["site_type"],
                    geom=geom_element,
                    area_hectares=area_ha,
                )
                session.add(site)
                await session.flush()
                total_sites += 1
                print(
                    f"   [Site] Added: '{site.name}' ({site.site_type}, {site.area_hectares:.2f} ha)"
                )

                # 3. Seed 12 Months of Time-Series Analytics
                base_c = site_info["base_carbon"]
                base_b = site_info["base_bio"]

                for month_offset in range(12, -1, -1):
                    rec_time = now - timedelta(days=month_offset * 30)

                    # Progressive growth curve with realistic monthly environmental fluctuations
                    carbon_val = base_c + (12 - month_offset) * (
                        base_c * 0.04
                    ) + random.uniform(-5.0, 8.0)
                    bio_val = min(
                        99.5,
                        base_b
                        + (12 - month_offset) * 0.8
                        + random.uniform(-1.5, 2.0),
                    )
                    canopy_val = min(
                        96.0, 68.0 + (12 - month_offset) * 1.5 + random.uniform(-2.0, 2.5)
                    )
                    soil_soc = 38.0 + (12 - month_offset) * 0.9 + random.uniform(-0.8, 1.2)

                    records = [
                        AnalyticsRecord(
                            site_id=site.id,
                            metric_name="carbon_sequestered_tons",
                            value=round(carbon_val, 2),
                            recorded_at=rec_time,
                            metric_metadata={
                                "sensor_type": "Sentinel-2 & GEDI LiDAR",
                                "confidence_score": 0.96,
                                "verification_body": "Verra VCS / Plan Vivo",
                            },
                        ),
                        AnalyticsRecord(
                            site_id=site.id,
                            metric_name="biodiversity_index",
                            value=round(bio_val, 2),
                            recorded_at=rec_time,
                            metric_metadata={
                                "sampling_method": "Bioacoustic bio-monitors & eDNA surveys",
                                "species_identified_count": random.randint(140, 310),
                            },
                        ),
                        AnalyticsRecord(
                            site_id=site.id,
                            metric_name="canopy_cover_percent",
                            value=round(canopy_val, 2),
                            recorded_at=rec_time,
                            metric_metadata={
                                "satellite": "PlanetScope Daily 3m Imagery",
                                "cloud_cover_percentage": 2.4,
                            },
                        ),
                        AnalyticsRecord(
                            site_id=site.id,
                            metric_name="soil_organic_carbon",
                            value=round(soil_soc, 2),
                            recorded_at=rec_time,
                            metric_metadata={
                                "depth_cm": "0-30cm",
                                "unit": "t C/ha",
                            },
                        ),
                    ]
                    for r in records:
                        session.add(r)
                        total_records += 1

        await session.commit()
        print(
            f"\n[OK] Seeding complete! Populated {len(SEED_PROJECTS)} projects, {total_sites} sites, and {total_records} historical analytics observations."
        )
        print("Demo Credentials:")
        print("  Administrator: admin@darukaa.earth / Password123!")
        print("  Evaluator:     evaluator@darukaa.earth / Password123!")
        print("  Viewer:        viewer@darukaa.earth / Password123!")


if __name__ == "__main__":
    asyncio.run(seed_database())
