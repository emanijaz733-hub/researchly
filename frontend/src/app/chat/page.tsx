"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, downloadText, streamSSE, tokens } from "@/lib/api";
import { CitedText, type Citation } from "@/components/CitedText";

interface ConvSummary { id: string; title: string; shared: boolean }
interface Msg { role: string; content: string; citations: Citation[] }

export default function ChatPage() {
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    try {
      setConvs(await api<ConvSummary[]>("/conversations"));
    } catch {
      setError(tokens.access ? "Could not load conversations." : "Sign in to use research chat.");
    }
  };

  useEffect(() => { void loadConvs(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const open = async (id: string) => {
    setActive(id);
    setShareUrl(null);
    const conv = await api<{ messages: Msg[] }>(`/conversations/${id}`);
    setMessages(conv.messages);
  };

  const send = async () => {
    const query = input.trim();
    if (!query || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    try {
      let convId = active;
      if (!convId) {
        const created = await api<{ id: string }>("/conversations", { method: "POST" });
        convId = created.id;
        setActive(convId);
      }
      setMessages((m) => [...m, { role: "user", content: query, citations: [] },
                               { role: "assistant", content: "", citations: [] }]);
      let citations: Citation[] = [];
      await streamSSE(`/conversations/${convId}/messages/stream`, { query }, (e) => {
        if (e.event === "results") {
          citations = (e.data as { title: string; url: string; provider: string }[])
            .map((r, i) => ({ n: i + 1, title: r.title, url: r.url, provider: r.provider }));
        }
        if (e.event === "answer") {
          const { delta } = e.data as { delta: string };
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + delta, citations };
            return copy;
          });
        }
      });
      await loadConvs();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!active) return;
    const r = await api<{ path: string }>(`/conversations/${active}/share`, { method: "POST" });
    const url = `${window.location.origin}${r.path}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard optional */ }
  };

  return (
    <main className="mx-auto flex h-screen max-w-6xl gap-8 px-5 py-6">
      <aside className="hidden w-60 shrink-0 flex-col md:flex">
        <Link href="/" className="mb-8 font-display text-xl font-semibold tracking-tight">
          Nexus<span className="text-cobalt">.</span>
        </Link>
        <button
          onClick={() => { setActive(null); setMessages([]); setShareUrl(null); }}
          className="mb-4 rounded-xl border border-hairline bg-surface py-2.5 text-sm font-medium text-ink shadow-card transition-colors hover:border-cobalt/40"
        >
          New research
        </button>
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {convs.map((c) => (
            <button key={c.id} onClick={() => open(c.id)}
              className={`truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                c.id === active ? "bg-wash text-ink" : "text-muted hover:bg-surface hover:text-ink"}`}>
              {c.title}
              {c.shared && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-cobalt">shared</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="mb-5 flex items-center justify-between border-b border-hairline pb-4">
          <h1 className="font-display text-lg font-medium">Research chat</h1>
          {active && (
            <div className="flex gap-4 text-sm text-muted">
              <button onClick={share} className="hover:text-ink">Share</button>
              <button onClick={() => downloadText(`/export/conversations/${active}.md`, "conversation.md")}
                className="hover:text-ink">Export</button>
            </div>
          )}
        </header>
        {shareUrl && (
          <p className="mb-4 truncate rounded-xl border border-cobalt/30 bg-wash px-4 py-2.5 text-sm text-cobalt-deep">
            Link copied: {shareUrl}
          </p>
        )}
        {error && <p className="mb-4 text-sm text-danger">{error}{" "}
          {!tokens.access &&
          <Link href="/login" className="text-cobalt underline-offset-2 hover:underline">Sign in</Link>}</p>}

        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          {messages.length === 0 && !error && (
            <div className="mt-24 text-center">
              <p className="font-display text-xl text-ink/80">Ask, then keep asking.</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Every question runs a fresh multi-provider search. Follow-ups keep
                the thread&apos;s context.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i}>
              {m.role === "user" ? (
                <p className="font-display text-lg font-medium leading-snug">{m.content}</p>
              ) : (
                <div className="max-w-measure text-[15px] leading-[1.75] text-ink/90">
                  <CitedText text={m.content} citations={m.citations} />
                  {m.citations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
                      {m.citations.map((c) => (
                        <a key={c.n} href={c.url} target="_blank" rel="noreferrer"
                           className="inline-flex max-w-[240px] items-center gap-1.5 truncate text-xs text-muted hover:text-cobalt">
                          <span className="cite-mark shrink-0">{c.n}</span>
                          <span className="truncate">{c.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-2 pl-4 shadow-field focus-within:border-cobalt/50">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={busy ? "Researching" : "Ask a follow-up"}
            aria-label="Chat message"
            disabled={busy}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
          />
          <button onClick={send} disabled={busy}
            className="shrink-0 rounded-xl bg-cobalt px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cobalt-deep disabled:opacity-50">
            Send
          </button>
        </div>
      </section>
    </main>
  );
}
