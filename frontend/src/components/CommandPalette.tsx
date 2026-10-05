"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Command {
  label: string;
  hint: string;
  run: () => void;
}

/** Ctrl K index: looks like a card pulled from a catalog drawer. */
export function CommandPalette({ onSearch }: { onSearch: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    { label: "New inquiry", hint: "home", run: () => router.push("/") },
    { label: "Correspondence", hint: "research chat", run: () => router.push("/chat") },
    { label: "Library", hint: "sources + notebook", run: () => router.push("/library") },
    { label: "Case files", hint: "workspaces", run: () => router.push("/workspaces") },
    { label: "Archive ledger", hint: "admin", run: () => router.push("/admin") },
    { label: "Reader's card", hint: "sign in", run: () => router.push("/login") },
  ];

  const filtered = value
    ? commands.filter((c) =>
        `${c.label} ${c.hint}`.toLowerCase().includes(value.toLowerCase())
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setValue("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const runSelected = () => {
    if (filtered.length > 0) {
      filtered[Math.min(selected, filtered.length - 1)].run();
    } else if (value.trim()) {
      onSearch(value.trim());
      router.push("/");
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-desk/60 px-4 pt-[18vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command index"
    >
      <div
        className="w-full max-w-lg -rotate-1 border-t-[3px] border-redink bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="type-label px-5 pt-4">INDEX CARD</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setSelected((s) => Math.min(s + 1, filtered.length - 1));
            if (e.key === "ArrowUp") setSelected((s) => Math.max(s - 1, 0));
            if (e.key === "Enter") runSelected();
          }}
          placeholder="Go to a page or type a question"
          aria-label="Command or question"
          className="w-full border-0 border-b border-dashed border-rule bg-transparent px-5 py-3 font-mono text-[16px] text-ink outline-none placeholder:text-muted/70"
        />
        <ul className="max-h-72 overflow-y-auto p-1">
          {filtered.map((c, i) => (
            <li key={c.label}>
              <button
                onClick={() => {
                  c.run();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelected(i)}
                className={`flex min-h-[44px] w-full items-center justify-between px-4 text-left text-[18px] ${
                  i === selected ? "bg-wash text-ink" : "text-muted"
                }`}
              >
                {c.label}
                <span className="font-mono text-[12px] text-muted">{c.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-[17px] italic text-muted">
              Press Enter to research “{value}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
