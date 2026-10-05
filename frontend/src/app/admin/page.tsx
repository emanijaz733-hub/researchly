"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Metrics {
  total_searches: number;
  total_users: number;
  avg_search_latency_ms: number;
  recent_searches: { query: string; providers: string; results: number; latency_ms: number; at: string }[];
}

/** Admin metrics as an accounting ledger. */
export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>("/metrics").then(setMetrics).catch((e) => setError(e.message));
  }, []);

  const entries: [string, string][] = metrics
    ? [
        ["TOTAL SEARCHES", String(metrics.total_searches)],
        ["READERS", String(metrics.total_users)],
        ["AVG. SEARCH TIME", `${Math.round(metrics.avg_search_latency_ms)} ms`],
      ]
    : [];

  const when = (at: string) => {
    const d = new Date(at);
    return Number.isNaN(d.getTime())
      ? at
      : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="min-h-screen bg-[#1f2a22] px-5 py-12">
      <div className="mx-auto flex max-w-6xl">
        <div className="w-7 shrink-0 bg-[#3c2414] shadow-[inset_-6px_0_10px_rgba(0,0,0,0.4)]" aria-hidden />
        <div className="min-w-0 flex-1 border-l-2 border-redink bg-[#eef0e0] bg-[repeating-linear-gradient(transparent_0_35px,rgba(60,110,70,0.22)_35px_36px)] px-5 pb-12 pt-9 text-[#1e2a20] shadow-sheet sm:px-12">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link href="/" className="font-mono text-[13px] tracking-[0.2em] text-[#3d5a44] no-underline">
                RESEARCHLY · ADMINISTRATOR
              </Link>
              <h1 className="mt-1 text-[40px] italic leading-tight">Archive ledger</h1>
            </div>
          </header>

          {error && (
            <p className="text-[18px] italic">
              {error === "Admin access required"
                ? "This ledger needs an admin account (set role='admin' on your user row)."
                : error}
            </p>
          )}

          {metrics && (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border-y-2 border-[#1e2a20]">
                {entries.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`px-4 py-3.5 ${i < entries.length - 1 ? "border-r border-[#1e2a20]/30" : ""}`}
                  >
                    <p className="font-mono text-[11px] tracking-[0.14em] text-[#3d5a44]">{label}</p>
                    <p className="mt-1 font-mono text-[34px]">{value}</p>
                  </div>
                ))}
              </div>

              <h2 className="mb-2 mt-9 font-mono text-[13px] tracking-[0.2em] text-[#3d5a44]">RECENT ENTRIES</h2>
              {metrics.recent_searches.length === 0 ? (
                <p className="italic">No searches recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse font-mono text-[14px]">
                    <thead>
                      <tr className="border-b-2 border-[#1e2a20] text-left">
                        <th className="h-9 px-2 font-normal">QUERY</th>
                        <th className="h-9 px-2 font-normal">ARCHIVES</th>
                        <th className="h-9 px-2 font-normal">RESULTS</th>
                        <th className="h-9 px-2 font-normal">MS</th>
                        <th className="h-9 px-2 font-normal">WHEN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recent_searches.map((s, i) => (
                        <tr key={i} className={s.results === 0 ? "text-redink" : ""}>
                          <td className="h-9 max-w-[320px] truncate px-2">{s.query}</td>
                          <td className="h-9 px-2">{s.providers}</td>
                          <td className="h-9 px-2">{s.results}</td>
                          <td className="h-9 px-2">{s.latency_ms}</td>
                          <td className="h-9 whitespace-nowrap px-2">{when(s.at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 font-hand text-[22px] text-redink">entries in red returned no results</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
