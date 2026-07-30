import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import init_db
from app.main import create_app


@pytest.mark.asyncio
async def test_register_login_me_and_bookmarks():
    app = create_app()
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        # register
        r = await client.post("/auth/register", json={
            "email": "test@example.com", "name": "Tester", "password": "supersecret1"})
        assert r.status_code == 201, r.text
        tokens = r.json()

        # duplicate email rejected
        r = await client.post("/auth/register", json={
            "email": "test@example.com", "name": "Tester", "password": "supersecret1"})
        assert r.status_code == 409

        # login
        r = await client.post("/auth/login", json={
            "email": "test@example.com", "password": "supersecret1"})
        assert r.status_code == 200

        # wrong password
        r = await client.post("/auth/login", json={
            "email": "test@example.com", "password": "wrong-password"})
        assert r.status_code == 401

        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        # me
        r = await client.get("/auth/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["email"] == "test@example.com"

        # refresh
        r = await client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        assert r.status_code == 200

        # default workspace created on register
        r = await client.get("/workspaces", headers=headers)
        assert r.status_code == 200
        assert len(r.json()) == 1

        # bookmarks CRUD
        r = await client.post("/bookmarks", headers=headers, json={
            "url": "https://example.com", "title": "Example"})
        assert r.status_code == 201
        bookmark_id = r.json()["id"]

        r = await client.get("/bookmarks", headers=headers)
        assert len(r.json()) == 1

        r = await client.delete(f"/bookmarks/{bookmark_id}", headers=headers)
        assert r.status_code == 204

        # unauthenticated access rejected
        r = await client.get("/bookmarks")
        assert r.status_code == 401

        # metrics requires admin
        r = await client.get("/metrics", headers=headers)
        assert r.status_code == 403

        # health open
        r = await client.get("/health")
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_refresh_token_rotation_blocks_reuse():
    app = create_app()
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        r = await client.post("/auth/register", json={
            "email": "rotate@test.com", "name": "Rotate", "password": "Str0ngPass!"})
        refresh = r.json()["refresh_token"]

        # first use succeeds and returns a new pair
        r1 = await client.post("/auth/refresh", json={"refresh_token": refresh})
        assert r1.status_code == 200

        # reusing the old refresh token must fail
        r2 = await client.post("/auth/refresh", json={"refresh_token": refresh})
        assert r2.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_access_and_refresh_tokens():
    app = create_app()
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as client:
        r = await client.post("/auth/register", json={
            "email": "logout@test.com", "name": "Logout", "password": "Str0ngPass!"})
        pair = r.json()
        headers = {"Authorization": f"Bearer {pair['access_token']}"}

        assert (await client.get("/auth/me", headers=headers)).status_code == 200

        r = await client.post("/auth/logout",
                              json={"refresh_token": pair["refresh_token"]}, headers=headers)
        assert r.status_code == 204

        # both tokens are now dead
        assert (await client.get("/auth/me", headers=headers)).status_code == 401
        r = await client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
        assert r.status_code == 401
