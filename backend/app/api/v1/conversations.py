"""Conversations: multi-turn research chat that preserves context.

Each turn runs a fresh multi-provider search; the answer is grounded in the
new sources AND the prior turns, then persisted with its citations.
"""
import json
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.answer import generate_followups, stream_answer
from app.api.deps import get_current_user, rate_limited
from app.core.database import get_session
from app.models import Conversation, Message, User
from app.providers.registry import get_providers
from app.schemas.api import SearchRequest
from app.search.orchestrator import SearchOrchestrator

router = APIRouter(prefix="/conversations", tags=["conversations"],
                   dependencies=[Depends(rate_limited)])


@router.get("")
async def list_conversations(user: User = Depends(get_current_user),
                             session: AsyncSession = Depends(get_session)):
    rows = await session.scalars(
        select(Conversation).where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc()))
    return [{"id": c.id, "title": c.title, "created_at": c.created_at,
             "shared": c.share_token is not None} for c in rows]


@router.post("", status_code=201)
async def create_conversation(user: User = Depends(get_current_user),
                              session: AsyncSession = Depends(get_session)):
    conv = Conversation(user_id=user.id)
    session.add(conv)
    await session.commit()
    return {"id": conv.id, "title": conv.title}


async def _owned(conv_id: str, user: User, session: AsyncSession) -> Conversation:
    conv = await session.scalar(select(Conversation).where(
        Conversation.id == conv_id, Conversation.user_id == user.id))
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return conv


def _message_out(m: Message) -> dict:
    return {"id": m.id, "role": m.role, "content": m.content,
            "citations": json.loads(m.citations_json), "created_at": str(m.created_at)}


@router.get("/{conv_id}")
async def get_conversation(conv_id: str, user: User = Depends(get_current_user),
                           session: AsyncSession = Depends(get_session)):
    conv = await _owned(conv_id, user, session)
    messages = await session.scalars(select(Message).where(
        Message.conversation_id == conv.id).order_by(Message.created_at))
    return {"id": conv.id, "title": conv.title, "share_token": conv.share_token,
            "messages": [_message_out(m) for m in messages]}


@router.delete("/{conv_id}", status_code=204)
async def delete_conversation(conv_id: str, user: User = Depends(get_current_user),
                              session: AsyncSession = Depends(get_session)):
    conv = await _owned(conv_id, user, session)
    for m in await session.scalars(select(Message).where(Message.conversation_id == conv.id)):
        await session.delete(m)
    await session.delete(conv)
    await session.commit()


@router.post("/{conv_id}/messages/stream")
async def ask(conv_id: str, body: SearchRequest,
              user: User = Depends(get_current_user),
              session: AsyncSession = Depends(get_session)):
    """SSE: results → answer deltas → followups → done. Persists both turns."""
    conv = await _owned(conv_id, user, session)
    prior = [
        {"role": m.role, "content": m.content}
        for m in await session.scalars(select(Message).where(
            Message.conversation_id == conv.id).order_by(Message.created_at))
    ]

    async def event_stream():
        orchestrator = SearchOrchestrator()
        outcome = await orchestrator.search(body.query, get_providers(body.providers))
        citations = [
            {"n": i + 1, "title": r.title, "url": r.url, "provider": r.provider}
            for i, r in enumerate(outcome.results[:8])
        ]
        yield _sse("results", [
            {"id": r.id, "title": r.title, "url": r.url, "snippet": r.snippet,
             "provider": r.provider, "score": r.score}
            for r in outcome.results[:8]
        ])

        answer_parts: list[str] = []
        async for delta in stream_answer(body.query, outcome.results, history=prior):
            answer_parts.append(delta)
            yield _sse("answer", {"delta": delta})
        answer = "".join(answer_parts)

        followups = await generate_followups(body.query, answer)
        if followups:
            yield _sse("followups", followups)

        session.add(Message(conversation_id=conv.id, role="user", content=body.query))
        session.add(Message(conversation_id=conv.id, role="assistant",
                            content=answer, citations_json=json.dumps(citations)))
        if conv.title == "Untitled research":
            conv.title = body.query[:80]
        await session.commit()
        yield _sse("done", {"latency_ms": outcome.total_latency_ms})

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/{conv_id}/share")
async def share(conv_id: str, user: User = Depends(get_current_user),
                session: AsyncSession = Depends(get_session)):
    conv = await _owned(conv_id, user, session)
    if conv.share_token is None:
        conv.share_token = secrets.token_urlsafe(24)
        await session.commit()
    return {"share_token": conv.share_token, "path": f"/shared/{conv.share_token}"}


@router.delete("/{conv_id}/share", status_code=204)
async def unshare(conv_id: str, user: User = Depends(get_current_user),
                  session: AsyncSession = Depends(get_session)):
    conv = await _owned(conv_id, user, session)
    conv.share_token = None
    await session.commit()


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
