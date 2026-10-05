"use client";
import { useState } from "react";
import { api, tokens } from "@/lib/api";
import type { Result } from "@/store/search";

/** One reference in the margin: [n], title, where it came from, file it. */
export function ResultCard({
  result,
  index,
  active,
}: {
  result: Result;
  index: number;
  active: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    setSaveError(null);
    try {
      await api("/bookmarks", {
        method: "POST",
        body: JSON.stringify({
          url: result.url,
          title: result.title,
          snippet: result.snippet,
          provider: result.provider,
        }),
      });
      setSaved(true);
    } catch (err) {
      setSaveError(tokens.access ? (err as Error).message : "Sign in to file sources");
    }
  };

  let host = "";
  try {
    host = new URL(result.url).hostname.replace(/^www\./, "");
  } catch {
    host = result.provider;
  }

  return (
    <div
      id={`source-${index}`}
      className={`flex gap-3 px-2 py-2 transition-colors ${active ? "bg-wash" : ""}`}
    >
      <span className="shrink-0 font-mono text-[15px] text-redink" aria-hidden>
        [{index}]
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="text-[17px] leading-snug text-ink no-underline hover:text-redink"
        >
          {result.title}
        </a>
        <span className="truncate font-mono text-[12px] text-muted">
          {host} · {result.provider}
        </span>
        {result.snippet && (
          <p className="line-clamp-3 text-[15px] leading-6 text-muted">{result.snippet}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saved}
            className="min-h-[32px] font-mono text-[12px] text-redink hover:text-redink-deep disabled:text-ok"
          >
            {saved ? "filed in library" : "+ file in library"}
          </button>
          {saveError && <span className="font-mono text-[12px] text-danger">{saveError}</span>}
        </div>
      </div>
    </div>
  );
}
