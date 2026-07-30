"""Markdown export and public shared-conversation view."""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, rate_limited
from app.core.database import get_session
from app.models import Bookmark, Conversation, Message, Note, User

router = APIRouter(tags=["export"], dependencies=[Depends(rate_limited)])


@router.get("/export/bookmarks.md", response_class=PlainTextResponse)
async def export_bookmarks(user: User = Depends(get_current_user),
                           session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(select(Bookmark).where(Bookmark.user_id == user.id)
                                 .order_by(Bookmark.created_at))
    lines = ["# Saved sources", ""]
    for b in rows:
        lines.append(f"- [{b.title}]({b.url}) — {b.provider}")
        if b.snippet:
            lines.append(f"  - {b.snippet}")
        if b.note:
            lines.append(f"  - note: {b.note}")
    return "\n".join(lines) + "\n"


@router.get("/export/notes.md", response_class=PlainTextResponse)
async def export_notes(user: User = Depends(get_current_user),
                       session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(select(Note).where(Note.user_id == user.id)
                                 .order_by(Note.created_at))
    parts = []
    for n in rows:
        parts.append(f"# {n.title}\n\n{n.content}\n")
    return "\n---\n\n".join(parts) or "# Notebook\n\nNo notes yet.\n"


def _conversation_markdown(conv: Conversation, messages: list[Message]) -> str:
    lines = [f"# {conv.title}", ""]
    for m in messages:
        lines.append(f"**{m.role}:**\n\n{m.content}\n")
        citations = json.loads(m.citations_json)
        if citations:
            lines.append("Sources:")
            lines.extend(f"- [{c['n']}] [{c['title']}]({c['url']})" for c in citations)
            lines.append("")
    return "\n".join(lines)


@router.get("/export/conversations/{conv_id}.md", response_class=PlainTextResponse)
async def export_conversation(conv_id: str, user: User = Depends(get_current_user),
                              session: AsyncSession = Depends(get_session)):
    conv = await session.scalar(select(Conversation).where(
        Conversation.id == conv_id, Conversation.user_id == user.id))
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    messages = list(await session.scalars(select(Message).where(
        Message.conversation_id == conv.id).order_by(Message.created_at)))
    return _conversation_markdown(conv, messages)


@router.get("/shared/{token}")
async def view_shared(token: str, session: AsyncSession = Depends(get_session)):
    """Public, read-only view of a shared conversation. No auth required."""
    conv = await session.scalar(select(Conversation).where(Conversation.share_token == token))
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This shared link does not exist or was revoked")
    messages = await session.scalars(select(Message).where(
        Message.conversation_id == conv.id).order_by(Message.created_at))
    return {"title": conv.title, "messages": [
        {"role": m.role, "content": m.content, "citations": json.loads(m.citations_json)}
        for m in messages
    ]}
