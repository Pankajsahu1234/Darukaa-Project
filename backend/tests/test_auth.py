import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register
    reg_data = {
        "email": "engineer@darukaa.earth",
        "password": "SecurePassword123!",
        "full_name": "Senior Engineer",
        "role": "admin",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_data)
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "engineer@darukaa.earth"

    # 2. Duplicate registration should fail
    dup_res = await client.post("/api/v1/auth/register", json=reg_data)
    assert dup_res.status_code == 400

    # 3. Login with correct credentials
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "engineer@darukaa.earth", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # 4. Login with invalid password
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "engineer@darukaa.earth", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 5. Access protected /me route
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "engineer@darukaa.earth"

    # 6. Refresh token flow
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
