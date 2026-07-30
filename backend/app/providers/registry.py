"""Provider registry: plugins register themselves at import time."""
from app.providers.base import SearchProvider

_REGISTRY: dict[str, SearchProvider] = {}


def register_provider(cls: type[SearchProvider]) -> type[SearchProvider]:
    instance = cls()
    if instance.name in _REGISTRY:
        raise ValueError(f"duplicate provider name: {instance.name}")
    _REGISTRY[instance.name] = instance
    return cls


def all_providers() -> dict[str, SearchProvider]:
    return dict(_REGISTRY)


def get_providers(names: list[str] | None) -> list[SearchProvider]:
    if not names:
        return [p for p in _REGISTRY.values() if p.enabled_by_default]
    return [_REGISTRY[n] for n in names if n in _REGISTRY]
