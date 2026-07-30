"""Importing this package registers all built-in providers."""
from app.providers import (  # noqa: F401
    arxiv,
    github,
    hackernews,
    openlibrary,
    stackexchange,
    wikipedia,
)
from app.providers.base import SearchProvider, SearchResult  # noqa: F401
from app.providers.registry import all_providers, get_providers, register_provider  # noqa: F401
