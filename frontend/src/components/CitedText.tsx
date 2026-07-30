"use client";
import { Fragment } from "react";

export interface Citation {
  n: number;
  title: string;
  url: string;
  provider?: string;
}

/** Render text where [n] markers become links to their cited source. */
export function CitedText({ text, citations }: { text: string; citations: Citation[] }) {
  const byN = new Map(citations.map((c) => [c.n, c]));
  const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*|\n)/g);
  return (
    <>
      {parts.map((part, i) => {
        const cite = part.match(/^\[(\d+)\]$/);
        if (cite) {
          const c = byN.get(parseInt(cite[1], 10));
          if (c) {
            return (
              <a key={i} href={c.url} target="_blank" rel="noreferrer"
                 title={c.title} className="cite-mark">
                {c.n}
              </a>
            );
          }
        }
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-semibold">{bold[1]}</strong>;
        if (part === "\n") return <br key={i} />;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
