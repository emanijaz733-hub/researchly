import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import init_db
from app.main import create_app


async def _client_with_user(email="conv@example.com"):
    app = create_app()
    await init_db()
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test/api/v1")
    r = await client.post("/auth/register", json={
        "email": email, "name": "Tester", "password": "supersecret1"})
    assert r.status_code == 201
    client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return client


@pytest.mark.asyncio
async def test_conversation_lifecycle_and_sharing():
    client = await _client_with_user("c1@example.com")

    r = await client.post("/conversations")
    assert r.status_code == 201
    conv_id = r.json()["id"]

    r = await client.get("/conversations")
    assert len(r.json()) == 1

    r = await client.get(f"/conversations/{conv_id}")
    assert r.json()["messages"] == []

    # sharing: token created, public view works, revocation kills it
    r = await client.post(f"/conversations/{conv_id}/share")
    token = r.json()["share_token"]
    assert token

    r = await client.get(f"/shared/{token}")
    assert r.status_code == 200

    r = await client.delete(f"/conversations/{conv_id}/share")
    assert r.status_code == 204
    r = await client.get(f"/shared/{token}")
    assert r.status_code == 404

    # other users cannot touch it
    other = await _client_with_user("c2@example.com")
    r = await other.get(f"/conversations/{conv_id}")
    assert r.status_code == 404

    r = await client.delete(f"/conversations/{conv_id}")
    assert r.status_code == 204
    await client.aclose()
    await other.aclose()


@pytest.mark.asyncio
async def test_notes_crud_and_annotation_and_export():
    client = await _client_with_user("n1@example.com")

    r = await client.post("/notes", json={"title": "Thesis ideas", "content": "compare IDS engines"})
    assert r.status_code == 201
    note_id = r.json()["id"]

    r = await client.put(f"/notes/{note_id}", json={"title": "Thesis ideas", "content": "updated"})
    assert r.json()["content"] == "updated"

    r = await client.get("/notes")
    assert len(r.json()) == 1

    # bookmark annotation
    r = await client.post("/bookmarks", json={"url": "https://example.com", "title": "Example"})
    bm_id = r.json()["id"]
    r = await client.patch(f"/bookmarks/{bm_id}/annotation", json={"note": "read section 3"})
    assert r.json()["note"] == "read section 3"

    # markdown export includes both
    r = await client.get("/export/bookmarks.md")
    assert "Example" in r.text and "read section 3" in r.text
    r = await client.get("/export/notes.md")
    assert "Thesis ideas" in r.text

    r = await client.delete(f"/notes/{note_id}")
    assert r.status_code == 204
    await client.aclose()
