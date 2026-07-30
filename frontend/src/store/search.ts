import { create } from "zustand";
import { streamSSE } from "@/lib/api";

export interface Result {
  id: string;
  title: string;
  url: string;
  snippet: string;
  provider: string;
  score: number;
  published_at: string | null;
}

export interface ProviderStatus {
  name: string;
  ok: boolean;
  latency_ms: number;
  result_count: number;
  error: string | null;
}

interface SearchState {
  query: string;
  phase: "idle" | "searching" | "answering" | "done" | "error";
  answer: string;
  results: Result[];
  providers: ProviderStatus[];
  latencyMs: number | null;
  followups: string[];
  error: string | null;
  activeCitation: number | null;
  setActiveCitation: (n: number | null) => void;
  run: (query: string) => Promise<void>;
}

let controller: AbortController | null = null;

export const useSearch = create<SearchState>((set) => ({
  query: "",
  phase: "idle",
  answer: "",
  results: [],
  providers: [],
  latencyMs: null,
  followups: [],
  error: null,
  activeCitation: null,
  setActiveCitation: (n) => set({ activeCitation: n }),

  run: async (query: string) => {
    controller?.abort();
    controller = new AbortController();
    set({
      query,
      phase: "searching",
      answer: "",
      results: [],
      providers: [],
      latencyMs: null,
      followups: [],
      error: null,
      activeCitation: null,
    });
    try {
      await streamSSE(
        "/search/stream",
        { query },
        (e) => {
          if (e.event === "providers") set({ providers: e.data as ProviderStatus[] });
          if (e.event === "results") set({ results: e.data as Result[], phase: "answering" });
          if (e.event === "answer") {
            const { delta } = e.data as { delta: string };
            set((s) => ({ answer: s.answer + delta }));
          }
          if (e.event === "followups") set({ followups: e.data as string[] });
          if (e.event === "done") {
            const { latency_ms } = e.data as { latency_ms: number };
            set({ phase: "done", latencyMs: latency_ms });
          }
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        set({ phase: "error", error: (err as Error).message });
      }
    }
  },
}));
