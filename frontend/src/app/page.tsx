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

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];

export default function Home() {
  const { run, phase, results, providers, error, latencyMs, activeCitation, followups } = useSearch();
  const busy = phase === "searching" || phase === "answering";
  const idle = phase === "idle";

  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-10">
      <CommandPalette onSearch={run} />
      <Nav />

      {idle ? (
        /* A blank sheet waiting for a question. */
        <section className="mx-auto max-w-3xl pb-24 pt-16 sm:pt-24">
          <h1 className="mb-10 text-[clamp(38px,5vw,58px)] italic leading-[1.12]">
            What are you researching today?
          </h1>

          <SearchBar onSearch={run} busy={busy} />

          <p className="mt-5 font-hand text-[22px] text-redink">
            {PROVIDERS.length} archives are standing by
          </p>

          <div className="mt-14 max-w-xl">
            <h2 className="type-label mb-2">TRY ONE OF THESE</h2>
            <div className="flex flex-col">
              {EXAMPLES.map((q, i) => (
                <button
                  key={q}
                  onClick={() => run(q)}
                  className="min-h-[44px] border-b border-dotted border-rule/60 py-3 text-left text-[19px] text-ink last:border-b-0 hover:text-redink"
                >
                  {ROMAN[i]}. {q}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-16 font-mono text-[12px] tracking-wide text-muted">
            Archives: {PROVIDERS.join(" · ")}
          </p>
        </section>
      ) : (
        /* The research paper: findings in the middle, references in the margin. */
        <section className="pb-24 pt-8">
          <div className="max-w-4xl">
            <SearchBar onSearch={run} busy={busy} />
            <div className="mt-4">
              <ProviderChips providers={providers} />
            </div>
          </div>

          {error && (
            <div className="mt-10 max-w-2xl -rotate-1 border-[2.5px] border-redink p-5 text-redink">
              <p className="type-label mb-1 !text-redink">THE ARCHIVE DID NOT ANSWER</p>
              <p className="text-[18px]">
                {error}. Check that the API is running, then try again.
              </p>
            </div>
          )}

          {!error && (
            <div className="rise-in mt-12 flex flex-wrap gap-12">
              <section aria-label="Findings" className="min-w-0 flex-[999_1_560px]">
                <AnswerPanel />
                {latencyMs !== null && (
                  <p className="mt-3 font-mono text-[12px] text-muted">answered in {latencyMs} ms</p>
                )}

                {followups.length > 0 && (
                  <div className="mt-12 border-t border-dotted border-rule pt-5">
                    <h2 className="type-label mb-2">FURTHER LINES OF INQUIRY</h2>
                    <div className="flex flex-col">
                      {followups.map((q, i) => (
                        <button
                          key={q}
                          onClick={() => run(q)}
                          className="min-h-[44px] border-b border-dotted border-rule/60 py-3 text-left text-[19px] text-ink last:border-b-0 hover:text-redink"
                        >
                          {ROMAN[i] ?? i + 1}. {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside
                aria-label="References"
                className="min-w-0 flex-[1_1_280px] border-l border-rule/50 pl-6"
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="type-label">REFERENCES</h2>
                  <span className="font-mono text-[12px] text-muted">{results.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {results.slice(0, 8).map((r, i) => (
                    <ResultCard key={r.id} result={r} index={i + 1} active={activeCitation === i + 1} />
                  ))}
                  {results.length === 0 && phase !== "searching" && (
                    <p className="italic text-muted">No sources found. Try broader terms.</p>
                  )}
                </div>
                {results.length > 0 && (
                  <p className="mt-6 text-[15px] italic text-muted">
                    Click a red number in the findings to jump to its reference.
                  </p>
                )}
              </aside>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
