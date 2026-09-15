import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sites_and_geometry_flow(client: AsyncClient, auth_headers: dict):
    # 1. Create a parent project
    proj_res = await client.post(
        "/api/v1/projects/",
        json={
            "name": "Western Ghats Corridor",
            "description": "Rainforest restoration",
        },
        headers=auth_headers,
    )
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]

    # 2. Add a site with valid GeoJSON Polygon
    site_payload = {
        "project_id": project_id,
        "name": "Agasthyamalai Ridge Reserve",
        "site_type": "biodiversity",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [77.220, 8.610],
                    [77.290, 8.630],
                    [77.300, 8.570],
                    [77.230, 8.560],
                    [77.220, 8.610],
                ]
            ],
        },
    }
    site_res = await client.post(
        "/api/v1/sites/", json=site_payload, headers=auth_headers
    )
    assert site_res.status_code == 201
    site_data = site_res.json()
    assert site_data["name"] == site_payload["name"]
    assert site_data["site_type"] == "biodiversity"
    # Area should be strictly positive (calculated in hectares)
    assert site_data["area_hectares"] > 0

    site_id = site_data["id"]

    # 3. Reject degenerate/invalid polygon (< 4 points)
    invalid_site_payload = {
        "project_id": project_id,
        "name": "Invalid Triangle Site",
        "site_type": "carbon",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[77.22, 8.61], [77.29, 8.63], [77.22, 8.61]]],
        },
    }
    inv_res = await client.post(
        "/api/v1/sites/", json=invalid_site_payload, headers=auth_headers
    )
    assert inv_res.status_code == 400

    # 4. Fetch site by ID
    get_site_res = await client.get(f"/api/v1/sites/{site_id}")
    assert get_site_res.status_code == 200
    assert get_site_res.json()["name"] == site_payload["name"]

    # 5. Fetch Mapbox-compatible GeoJSON FeatureCollection
    geojson_res = await client.get("/api/v1/sites/geojson")
    assert geojson_res.status_code == 200
    fc = geojson_res.json()
    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) >= 1
    assert fc["features"][0]["geometry"]["type"] == "Polygon"
    assert "area_hectares" in fc["features"][0]["properties"]
