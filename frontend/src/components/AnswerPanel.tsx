"use client";
import { Fragment } from "react";
import { useSearch } from "@/store/search";

/** Renders the streamed answer, turning [n] markers into interactive
 * citations that highlight the matching source card. */
export function AnswerPanel() {
  const { answer, phase, setActiveCitation, results } = useSearch();
  if (phase === "idle") return null;

  if (phase === "searching") {
    return (
      <div className="flex items-center gap-2.5 text-sm text-muted" role="status">
        <span className="soft-pulse h-2 w-2 rounded-full bg-cobalt" aria-hidden />
        Reading every source in parallel
      </div>
    );
  }

  return (
    <article
      aria-live="polite"
      className="max-w-measure text-[16px] leading-[1.75] text-ink/90"
    >
      {renderWithCitations(answer, results.length, setActiveCitation)}
      {phase === "answering" && <span className="stream-caret" aria-hidden />}
    </article>
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
