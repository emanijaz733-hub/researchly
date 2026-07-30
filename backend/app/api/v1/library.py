"""Bookmarks, collections, and workspaces."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, rate_limited
from app.core.database import get_session
from app.models import Bookmark, Collection, User, Workspace
from app.schemas.api import BookmarkCreate, BookmarkOut, CollectionCreate, WorkspaceCreate

router = APIRouter(tags=["library"], dependencies=[Depends(rate_limited)])


@router.get("/workspaces")
async def list_workspaces(user: User = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(select(Workspace).where(Workspace.owner_id == user.id))
    return [{"id": w.id, "name": w.name, "created_at": w.created_at} for w in rows]


@router.post("/workspaces", status_code=201)
async def create_workspace(body: WorkspaceCreate, user: User = Depends(get_current_user),
                           session: AsyncSession = Depends(get_session)):
    ws = Workspace(name=body.name, owner_id=user.id)
    session.add(ws)
    await session.commit()
    return {"id": ws.id, "name": ws.name}


@router.post("/collections", status_code=201)
async def create_collection(body: CollectionCreate, user: User = Depends(get_current_user),
                            session: AsyncSession = Depends(get_session)):
    ws = await session.scalar(select(Workspace).where(
        Workspace.id == body.workspace_id, Workspace.owner_id == user.id))
    if ws is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    col = Collection(name=body.name, workspace_id=ws.id)
    session.add(col)
    await session.commit()
    return {"id": col.id, "name": col.name, "workspace_id": ws.id}


@router.get("/bookmarks", response_model=list[BookmarkOut])
async def list_bookmarks(user: User = Depends(get_current_user),
                         session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(
        select(Bookmark).where(Bookmark.user_id == user.id).order_by(Bookmark.created_at.desc()))
    return [BookmarkOut(id=b.id, url=b.url, title=b.title, snippet=b.snippet, provider=b.provider,
                        note=b.note, collection_id=b.collection_id, created_at=b.created_at)
            for b in rows]


@router.post("/bookmarks", status_code=201)
async def create_bookmark(body: BookmarkCreate, user: User = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    bm = Bookmark(user_id=user.id, **body.model_dump())
    session.add(bm)
    await session.commit()
    return {"id": bm.id}


@router.delete("/bookmarks/{bookmark_id}", status_code=204)
async def delete_bookmark(bookmark_id: str, user: User = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    bm = await session.scalar(select(Bookmark).where(
        Bookmark.id == bookmark_id, Bookmark.user_id == user.id))
    if bm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bookmark not found")
    await session.delete(bm)
    await session.commit()
