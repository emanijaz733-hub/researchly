"use client";
import { Fragment } from "react";
import { useSearch } from "@/store/search";

/** The findings: streamed answer in clean serif, with red footnote numbers
 * that highlight and jump to the matching reference. */
export function AnswerPanel() {
  const { answer, phase, setActiveCitation, results } = useSearch();
  if (phase === "idle") return null;

  if (phase === "searching") {
    return (
      <div className="flex items-center gap-3 font-mono text-[14px] text-muted" role="status">
        <span className="soft-pulse h-2 w-2 rounded-full bg-redink" aria-hidden />
        Consulting the archives…
      </div>
    );
  }

  return (
    <section>
      <h2 className="type-label mb-4">FINDINGS</h2>
      <article aria-live="polite" className="max-w-measure text-[20px] leading-[1.75] text-ink">
        {renderWithCitations(answer, results.length, setActiveCitation)}
        {phase === "answering" && <span className="stream-caret" aria-hidden />}
      </article>
    </section>
  );
}

function renderWithCitations(
  text: string,
  sourceCount: number,
  setActive: (n: number | null) => void
) {
  const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*|\n)/g);
  return parts.map((part, i) => {
    const cite = part.match(/^\[(\d+)\]$/);
    if (cite) {
      const n = parseInt(cite[1], 10);
      if (n >= 1 && n <= sourceCount) {
        return (
          <button
            key={i}
            className="cite-mark"
            onMouseEnter={() => setActive(n)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(n)}
            onBlur={() => setActive(null)}
            onClick={() => {
              document.getElementById(`source-${n}`)?.scrollIntoView({ block: "nearest" });
            }}
            aria-label={`Citation ${n}`}
          >
            {n}
          </button>
        );
      }
    }
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
    if (part === "\n") return <br key={i} />;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
