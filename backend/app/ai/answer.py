"""Answer synthesis with citations.

With an LLM configured, sources are numbered and passed to the model with
instructions to cite as [n]; prior conversation turns are included so
follow-up questions keep context. Without a key, an extractive fallback
builds a readable summary directly from the top sources.
"""
from collections.abc import AsyncIterator

from app.ai.llm import get_backend
from app.providers.base import SearchResult

SYSTEM_PROMPT = """You are the research engine of NEXUS. Answer the user's query using ONLY the numbered sources provided.
Rules:
- Cite every factual claim with its source number in brackets, e.g. [2].
- If sources conflict, say so explicitly and cite both sides.
- If the sources do not answer the question, say what is missing. Never invent facts.
- Structure: a 2-3 sentence summary, then details. Plain, direct language."""

FOLLOWUP_PROMPT = """Given the user's query and the answer, suggest 3 short follow-up research questions.
Return ONLY the 3 questions, one per line, no numbering, no other text."""


def build_context(results: list[SearchResult], max_sources: int = 8) -> str:
    lines = []
    for i, r in enumerate(results[:max_sources], start=1):
        lines.append(f"[{i}] {r.title} ({r.provider})\n{r.snippet}\nURL: {r.url}")
    return "\n\n".join(lines)


async def stream_answer(
    query: str,
    results: list[SearchResult],
    history: list[dict] | None = None,
) -> AsyncIterator[str]:
    """history: prior turns as [{"role": "user"|"assistant", "content": str}]."""
    if not results:
        yield "No sources were found for this query. Try broader terms or different providers."
        return

    backend = get_backend()
    if backend is None:
        for chunk in _extractive_answer(query, results):
            yield chunk
        return

    parts = []
    if history:
        turns = "\n".join(f"{m['role']}: {m['content'][:600]}" for m in history[-6:])
        parts.append(f"Conversation so far:\n{turns}\n")
    parts.append(f"Query: {query}\n\nSources:\n{build_context(results)}")
    async for delta in backend.stream(SYSTEM_PROMPT, "\n".join(parts)):
        yield delta


async def generate_followups(query: str, answer: str) -> list[str]:
    """Suggest follow-up questions. Empty list when no LLM is configured."""
    backend = get_backend()
    if backend is None or not answer:
        return []
    try:
        chunks = []
        async for delta in backend.stream(FOLLOWUP_PROMPT, f"Query: {query}\n\nAnswer:\n{answer[:2000]}"):
            chunks.append(delta)
        lines = [ln.strip("-• ").strip() for ln in "".join(chunks).splitlines()]
        return [ln for ln in lines if ln][:3]
    except Exception:
        return []


def _extractive_answer(query: str, results: list[SearchResult]):
    yield f"Top sources for \u201c{query}\u201d (no LLM key configured \u2014 extractive mode):\n\n"
    for i, r in enumerate(results[:5], start=1):
        snippet = r.snippet or "No preview available."
        yield f"{i}. **{r.title}** [{i}]\n{snippet}\n\n"
    yield "Configure NEXUS_ANTHROPIC_API_KEY (or an OpenAI key) for synthesized, reasoned answers."
