"use client";
import { useState } from "react";
import { api, tokens } from "@/lib/api";
import type { Result } from "@/store/search";

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
      setSaveError(tokens.access ? (err as Error).message : "Sign in to save sources");
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
      className={`relative rounded-xl border bg-surface p-4 shadow-card transition-colors ${
        active ? "border-cobalt/60 bg-wash/60" : "border-hairline"
      }`}
    >
      <span
        className={`absolute inset-y-3 left-0 w-0.5 rounded-full transition-opacity ${
          active ? "bg-cobalt opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="cite-mark cursor-default" aria-hidden>{index}</span>
        <span className="truncate text-[11px] text-muted">
          {host} · {result.provider}
        </span>
      </div>
      <a
        href={result.url}
        target="_blank"
        rel="noreferrer"
        className="block text-sm font-medium leading-snug hover:text-cobalt"
      >
        {result.title}
      </a>
      {result.snippet && (
        <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted">{result.snippet}</p>
      )}
      <div className="mt-2.5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saved}
          className="text-xs font-medium text-muted hover:text-cobalt disabled:text-ok"
        >
          {saved ? "Saved" : "Save"}
        </button>
        {saveError && <span className="text-[11px] text-danger">{saveError}</span>}
      </div>
    </div>
  );
}
