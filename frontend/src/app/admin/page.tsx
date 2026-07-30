"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";

interface Metrics {
  total_searches: number;
  total_users: number;
  avg_search_latency_ms: number;
  recent_searches: { query: string; providers: string; results: number; latency_ms: number; at: string }[];
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>("/metrics").then(setMetrics).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-5">
      <Nav />
      <div className="mb-8 border-b border-hairline pb-4 pt-4">
        <h1 className="font-display text-2xl font-medium">Operations</h1>
      </div>
      {error && (
        <p className="text-sm text-muted">
          {error === "Admin access required"
            ? "This dashboard needs an admin account (set role='admin' on your user row)."
            : error}
        </p>
      )}
      {metrics && (
        <>
          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["Searches", metrics.total_searches],
              ["Users", metrics.total_users],
              ["Avg latency", `${metrics.avg_search_latency_ms}ms`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-hairline bg-surface p-5 shadow-card">
                <p className="font-display text-3xl font-medium">{value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
              </div>
            ))}
          </div>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">Recent searches</h2>
          <div className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline bg-surface shadow-card">
            {metrics.recent_searches.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span className="truncate text-sm">{s.query}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted">
                  {s.results} results · {s.latency_ms}ms
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
