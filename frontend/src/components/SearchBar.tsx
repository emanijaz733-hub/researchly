"use client";
import { useState } from "react";

/** The query line: a dashed rule you type on, and a red ink stamp to submit. */
export function SearchBar({ onSearch, busy }: { onSearch: (q: string) => void; busy: boolean }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (q && !busy) onSearch(q);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="research-query" className="type-label">
        YOUR QUESTION
      </label>
      <div className="flex flex-wrap items-end gap-5">
        <input
          id="research-query"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What are you researching today?"
          className="min-w-0 flex-[999_1_420px] border-0 border-b-2 border-dashed border-rule bg-transparent pb-2.5 pt-1.5 text-[26px] italic text-ink outline-none placeholder:text-muted/70 focus:border-redink"
          autoFocus
        />
        <button onClick={submit} disabled={busy} className="stamp shrink-0">
          {busy ? "CONSULTING…" : "CONSULT SOURCES"}
        </button>
      </div>
    </div>
  );
}
