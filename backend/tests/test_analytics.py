from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analytics_records_and_summary_flow(
    client: AsyncClient, auth_headers: dict
):
    # 1. Setup project & site
    proj_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Amazon Agroforestry", "description": "Canopy carbon project"},
        headers=auth_headers,
    )
    project_id = proj_res.json()["id"]

    site_res = await client.post(
        "/api/v1/sites/",
        json={
            "project_id": project_id,
            "name": "Rio Branco Parcel",
            "site_type": "carbon",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-67.850, -9.920],
                        [-67.770, -9.900],
                        [-67.750, -9.960],
                        [-67.840, -9.970],
                        [-67.850, -9.920],
                    ]
                ],
            },
        },
        headers=auth_headers,
    )
    site_id = site_res.json()["id"]

    # 2. Post sequential monthly records
    now = datetime.now(timezone.utc)
    for i in range(3):
        rec_time = (now - timedelta(days=(3 - i) * 30)).isoformat()
        val = 150.0 + (i * 25.0)
        rec_res = await client.post(
            "/api/v1/analytics/records",
            json={
                "site_id": site_id,
                "metric_name": "carbon_sequestered_tons",
                "value": val,
                "recorded_at": rec_time,
                "metric_metadata": {"sensor": "Sentinel-2"},
            },
            headers=auth_headers,
        )
        assert rec_res.status_code == 201

    # 3. Query site analytics summary
    summary_res = await client.get(f"/api/v1/analytics/sites/{site_id}/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["site_id"] == site_id
    assert "carbon_sequestered_tons" in summary["metrics_available"]
    assert summary["latest_values"]["carbon_sequestered_tons"] == 200.0
    stats = summary["statistics"]["carbon_sequestered_tons"]
    assert stats["min"] == 150.0
    assert stats["max"] == 200.0
    assert stats["average"] == 175.0

    # 4. Query time-series endpoint
    ts_res = await client.get(
        f"/api/v1/analytics/sites/{site_id}/time-series?metric_name=carbon_sequestered_tons"
    )
    assert ts_res.status_code == 200
    pts = ts_res.json()
    assert len(pts) == 3
    assert pts[0]["value"] == 150.0
    assert pts[2]["value"] == 200.0
