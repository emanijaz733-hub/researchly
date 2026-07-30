"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Command {
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette({ onSearch }: { onSearch: (q: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    { label: "Go to search", hint: "home", run: () => router.push("/") },
    { label: "Research chat", hint: "multi-turn", run: () => router.push("/chat") },
    { label: "Open library", hint: "sources + notebook", run: () => router.push("/library") },
    { label: "Workspaces", hint: "organize", run: () => router.push("/workspaces") },
    { label: "Admin dashboard", hint: "metrics", run: () => router.push("/admin") },
    { label: "Sign in", hint: "account", run: () => router.push("/login") },
  ];

  const filtered = value
    ? commands.filter((c) => c.label.toLowerCase().includes(value.toLowerCase()))
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 pt-[18vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface shadow-overlay"
        onClick={(e) => e.stopPropagation()}
      >
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
          placeholder="Type a command or search…"
          className="w-full border-b border-hairline bg-transparent px-5 py-3.5 text-sm outline-none placeholder:text-muted/70"
        />
        <ul className="max-h-64 overflow-y-auto p-1">
          {filtered.map((c, i) => (
            <li key={c.label}>
              <button
                onClick={() => {
                  c.run();
                  setOpen(false);
                }}
                onMouseEnter={() => setSelected(i)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                  i === selected ? "bg-wash text-ink" : "text-muted"
                }`}
              >
                {c.label}
                <span className="text-[11px] text-muted/70">{c.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted">
              Press Enter to search “{value}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
