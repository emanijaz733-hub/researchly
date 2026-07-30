"""Notebook (notes CRUD) and bookmark annotations."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, rate_limited
from app.core.database import get_session
from app.models import Bookmark, Note, User

router = APIRouter(tags=["notebook"], dependencies=[Depends(rate_limited)])


class NoteIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = ""


class AnnotationIn(BaseModel):
    note: str = Field(max_length=5000)


def _note_out(n: Note) -> dict:
    return {"id": n.id, "title": n.title, "content": n.content,
            "created_at": n.created_at, "updated_at": n.updated_at}


@router.get("/notes")
async def list_notes(user: User = Depends(get_current_user),
                     session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(select(Note).where(Note.user_id == user.id)
                                 .order_by(Note.updated_at.desc()))
    return [_note_out(n) for n in rows]


@router.post("/notes", status_code=201)
async def create_note(body: NoteIn, user: User = Depends(get_current_user),
                      session: AsyncSession = Depends(get_session)):
    note = Note(user_id=user.id, title=body.title, content=body.content)
    session.add(note)
    await session.commit()
    return _note_out(note)


async def _owned_note(note_id: str, user: User, session: AsyncSession) -> Note:
    note = await session.scalar(select(Note).where(Note.id == note_id, Note.user_id == user.id))
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    return note


@router.put("/notes/{note_id}")
async def update_note(note_id: str, body: NoteIn, user: User = Depends(get_current_user),
                      session: AsyncSession = Depends(get_session)):
    note = await _owned_note(note_id, user, session)
    note.title, note.content = body.title, body.content
    await session.commit()
    return _note_out(note)


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, user: User = Depends(get_current_user),
                      session: AsyncSession = Depends(get_session)):
    note = await _owned_note(note_id, user, session)
    await session.delete(note)
    await session.commit()


@router.patch("/bookmarks/{bookmark_id}/annotation")
async def annotate_bookmark(bookmark_id: str, body: AnnotationIn,
                            user: User = Depends(get_current_user),
                            session: AsyncSession = Depends(get_session)):
    bm = await session.scalar(select(Bookmark).where(
        Bookmark.id == bookmark_id, Bookmark.user_id == user.id))
    if bm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bookmark not found")
    bm.note = body.note
    await session.commit()
    return {"id": bm.id, "note": bm.note}
