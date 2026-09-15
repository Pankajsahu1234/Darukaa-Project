import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_project_crud_flow(client: AsyncClient, auth_headers: dict):
    # 1. List projects initially (should be empty in test DB)
    list_res = await client.get("/api/v1/projects/")
    assert list_res.status_code == 200
    assert list_res.json() == []

    # 2. Create project without auth should fail
    fail_res = await client.post(
        "/api/v1/projects/",
        json={"name": "Unauthorized Project", "description": "Should fail"},
    )
    assert fail_res.status_code == 401

    # 3. Create project with auth
    create_payload = {
        "name": "Sundarbans Delta Mangrove Restoration",
        "description": "High-integrity blue carbon sequestration initiative.",
    }
    create_res = await client.post(
        "/api/v1/projects/", json=create_payload, headers=auth_headers
    )
    assert create_res.status_code == 201
    project_data = create_res.json()
    project_id = project_data["id"]
    assert project_data["name"] == create_payload["name"]
    assert project_data["sites_count"] == 0

    # 4. Fetch project by ID
    get_res = await client.get(f"/api/v1/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # 5. Update project
    update_payload = {
        "name": "Sundarbans Delta Mangrove Phase II",
        "description": "Updated project scope.",
    }
    update_res = await client.put(
        f"/api/v1/projects/{project_id}",
        json=update_payload,
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == update_payload["name"]

    # 6. Delete project
    delete_res = await client.delete(
        f"/api/v1/projects/{project_id}", headers=auth_headers
    )
    assert delete_res.status_code == 204

    # 7. Fetching deleted project should return 404
    not_found_res = await client.get(f"/api/v1/projects/{project_id}")
    assert not_found_res.status_code == 404
