"use client";
import { AnswerPanel } from "@/components/AnswerPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { Nav } from "@/components/Nav";
import { ProviderChips } from "@/components/ProviderChips";
import { ResultCard } from "@/components/ResultCard";
import { SearchBar } from "@/components/SearchBar";
import { useSearch } from "@/store/search";

const EXAMPLES = [
  "How do transformers handle long context?",
  "What is a memory-safe language, and why does it matter?",
  "Current approaches to detecting AI-generated images",
];

const PROVIDERS = ["Wikipedia", "arXiv", "Hacker News", "GitHub", "Stack Exchange", "Open Library"];

export default function Home() {
  const { run, phase, results, providers, error, latencyMs, activeCitation, followups } = useSearch();
  const busy = phase === "searching" || phase === "answering";
  const idle = phase === "idle";

  return (
    <main className="mx-auto max-w-6xl px-5">
      <CommandPalette onSearch={run} />
      <Nav />

      {idle ? (
        <section className="mx-auto max-w-2xl pb-24 pt-20 text-center sm:pt-28">
          <h1 className="font-display text-5xl font-medium leading-[1.08] tracking-tight sm:text-6xl">
            Ask once.
            <br />
            Read every source.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">
            Nexus searches six research libraries in parallel and writes one
            answer, cited line by line.
          </p>

          <div className="mt-10 text-left">
            <SearchBar onSearch={run} busy={busy} />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((q) => (
              <button
                key={q}
                onClick={() => run(q)}
                className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-cobalt/40 hover:text-ink"
              >
                {q}
              </button>
            ))}
          </div>

          <p className="mt-16 text-xs tracking-wide text-muted/70">
            {PROVIDERS.join("  ·  ")}
          </p>
        </section>
      ) : (
        <section className="pb-20 pt-4">
          <div className="mx-auto max-w-3xl">
            <SearchBar onSearch={run} busy={busy} />
            <div className="mt-4">
              <ProviderChips providers={providers} />
            </div>
          </div>

          {error && (
            <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-danger/30 bg-surface p-4 text-sm text-danger">
              Search failed: {error}. Check that the API is running, then try again.
            </div>
          )}

          {!error && (
            <div className="rise-in mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section aria-label="Answer">
                <div className="mb-4 flex items-baseline gap-3 border-b border-hairline pb-3">
                  <h2 className="font-display text-lg font-medium">Answer</h2>
                  {latencyMs !== null && (
                    <span className="font-mono text-[11px] text-muted">
                      searched in {latencyMs}ms
                    </span>
                  )}
                </div>
                <AnswerPanel />
                {followups.length > 0 && (
                  <div className="mt-8 border-t border-hairline pt-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                      Keep going
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {followups.map((q) => (
                        <button
                          key={q}
                          onClick={() => run(q)}
                          className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-left text-xs text-muted transition-colors hover:border-cobalt/40 hover:text-ink"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside aria-label="Sources">
                <div className="mb-4 flex items-baseline justify-between border-b border-hairline pb-3">
                  <h2 className="font-display text-lg font-medium">Sources</h2>
                  <span className="font-mono text-[11px] text-muted">{results.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {results.slice(0, 8).map((r, i) => (
                    <ResultCard key={r.id} result={r} index={i + 1} active={activeCitation === i + 1} />
                  ))}
                  {results.length === 0 && phase !== "searching" && (
                    <p className="text-xs text-muted">No sources found. Try broader terms.</p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
