"use client";
import type { ProviderStatus } from "@/store/search";

/** Slim ledger of provider outcomes: status dot, count, latency. */
export function ProviderChips({ providers }: { providers: ProviderStatus[] }) {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Provider status">
      {providers.map((p) => (
        <span
          key={p.name}
          title={p.error ?? `${p.result_count} results in ${p.latency_ms} ms`}
          className="inline-flex items-center gap-1.5 text-xs text-muted"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${p.ok ? "bg-ok" : "bg-danger"}`}
            aria-hidden
          />
          <span className={p.ok ? "" : "text-danger"}>{p.name}</span>
          {p.ok && (
            <span className="font-mono text-[11px] text-muted/70">
              {p.result_count} in {p.latency_ms}ms
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
