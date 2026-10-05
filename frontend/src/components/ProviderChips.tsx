"use client";
import type { ProviderStatus } from "@/store/search";

/** Typed log line of which archives answered, how fast, and which failed. */
export function ProviderChips({ providers }: { providers: ProviderStatus[] }) {
  if (providers.length === 0) return null;
  const ok = providers.filter((p) => p.ok).length;
  return (
    <p className="font-mono text-[13px] leading-[1.9] text-muted" aria-label="Archive status">
      Consulted {ok} of {providers.length} archives —{" "}
      {providers.map((p, i) => (
        <span key={p.name} title={p.error ?? undefined}>
          {p.ok ? (
            <>
              {p.name} ({p.result_count} · {p.latency_ms} ms)
            </>
          ) : (
            <span className="text-redink">{p.name} — no reply</span>
          )}
          {i < providers.length - 1 && " · "}
        </span>
      ))}
    </p>
  );
}
