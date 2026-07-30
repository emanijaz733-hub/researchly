from app.providers.base import SearchResult
from app.search.pipeline import deduplicate, normalize, run_pipeline, score


def make(title, url, snippet="", raw=0.5):
    return SearchResult(title=title, url=url, snippet=snippet, provider="test", raw_score=raw)


def test_normalize_strips_tracking_and_whitespace():
    r = make("  Hello   World ", "https://Example.com/page/?utm_source=x&id=1")
    out = normalize([r])
    assert out[0].title == "Hello World"
    assert out[0].url == "https://example.com/page?id=1"


def test_normalize_drops_missing_urls():
    assert normalize([make("t", "")]) == []


def test_deduplicate_keeps_highest_score_per_url():
    a = make("Same page", "https://example.com/a", raw=0.3)
    b = make("Same page", "https://example.com/a", raw=0.9)
    out = deduplicate(normalize([a, b]))
    assert len(out) == 1
    assert out[0].raw_score == 0.9


def test_deduplicate_removes_near_duplicate_titles():
    a = make("Intro to Zero Trust Networks", "https://a.com/1", raw=0.9)
    b = make("Intro to Zero Trust Networks!", "https://b.com/2", raw=0.4)
    out = deduplicate(normalize([a, b]))
    assert len(out) == 1
    assert out[0].url.startswith("https://a.com")


def test_score_rewards_query_overlap():
    relevant = make("Python asyncio tutorial", "https://a.com", "asyncio in python explained", raw=0.5)
    irrelevant = make("Banana bread recipe", "https://b.com", "baking tips", raw=0.5)
    score([relevant, irrelevant], "python asyncio")
    assert relevant.score > irrelevant.score


def test_run_pipeline_orders_and_limits():
    results = [
        make("Python asyncio guide", "https://a.com", "asyncio python", raw=0.9),
        make("Unrelated", "https://b.com", "nothing", raw=0.1),
        make("Asyncio patterns in Python", "https://c.com", "python asyncio patterns", raw=0.7),
    ]
    out = run_pipeline(results, "python asyncio", limit=2)
    assert len(out) == 2
    assert out[0].score >= out[1].score
