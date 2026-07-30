"use client";
import { useState } from "react";

export function SearchBar({ onSearch, busy }: { onSearch: (q: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (q && !busy) onSearch(q);
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-2 pl-5 shadow-field transition-shadow focus-within:border-cobalt/50 focus-within:shadow-overlay">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Ask a research question"
        aria-label="Search query"
        className="w-full bg-transparent text-base outline-none placeholder:text-muted/70"
        autoFocus
      />
      <button
        onClick={submit}
        disabled={busy}
        className="shrink-0 rounded-xl bg-cobalt px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cobalt-deep disabled:opacity-50"
      >
        {busy ? "Searching" : "Search"}
      </button>
    </div>
  );
}
