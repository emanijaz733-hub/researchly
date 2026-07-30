"""Result processing pipeline: normalize → deduplicate → score → rank.

Pure functions over SearchResult lists so every stage is unit-testable.
"""
import html
import math
import re
from urllib.parse import urlparse, urlunparse

from app.providers.base import SearchResult

_TRACKING_PARAMS = ("utm_", "fbclid", "gclid", "ref=")


def normalize(results: list[SearchResult]) -> list[SearchResult]:
    """Trim whitespace, drop results without a URL, canonicalize URLs."""
    cleaned: list[SearchResult] = []
    for r in results:
        if not r.url:
            continue
        r.title = html.unescape(re.sub(r"\s+", " ", r.title).strip()) or "(untitled)"
        r.snippet = html.unescape(re.sub(r"\s+", " ", r.snippet).strip())
        r.url = _canonical_url(r.url)
        cleaned.append(r)
    return cleaned


def _canonical_url(url: str) -> str:
    parsed = urlparse(url.strip())
    query = "&".join(
        p for p in parsed.query.split("&")
        if p and not any(p.startswith(t) for t in _TRACKING_PARAMS)
    )
    return urlunparse(
        (parsed.scheme or "https", parsed.netloc.lower(), parsed.path.rstrip("/"), "", query, "")
    )


def deduplicate(results: list[SearchResult]) -> list[SearchResult]:
    """Drop exact URL duplicates and near-duplicate titles, keeping the
    highest-raw-score copy."""
    by_url: dict[str, SearchResult] = {}
    for r in results:
        existing = by_url.get(r.url)
        if existing is None or r.raw_score > existing.raw_score:
            by_url[r.url] = r

    kept: list[SearchResult] = []
    seen_titles: list[set[str]] = []
    for r in sorted(by_url.values(), key=lambda x: -x.raw_score):
        tokens = _title_tokens(r.title)
        if any(_jaccard(tokens, prev) > 0.85 for prev in seen_titles):
            continue
        seen_titles.append(tokens)
        kept.append(r)
    return kept


def _title_tokens(title: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", title.lower()))


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def score(results: list[SearchResult], query: str) -> list[SearchResult]:
    """Blend the provider's own signal with lexical relevance to the query.

    This is deliberately a simple, transparent baseline; swap in embedding
    similarity here for semantic ranking without touching callers.
    """
    q_tokens = _title_tokens(query)
    for r in results:
        text_tokens = _title_tokens(r.title) | _title_tokens(r.snippet)
        overlap = len(q_tokens & text_tokens) / max(1, len(q_tokens))
        length_bonus = min(1.0, math.log1p(len(r.snippet)) / 6)
        r.score = round(0.45 * r.raw_score + 0.45 * overlap + 0.10 * length_bonus, 4)
    return results


def rank(results: list[SearchResult], limit: int | None = None) -> list[SearchResult]:
    ordered = sorted(results, key=lambda r: -r.score)
    return ordered[:limit] if limit else ordered


def run_pipeline(results: list[SearchResult], query: str, limit: int | None = None) -> list[SearchResult]:
    return rank(score(deduplicate(normalize(results)), query), limit)
