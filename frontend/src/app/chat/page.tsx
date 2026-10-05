"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, downloadText, streamSSE, tokens } from "@/lib/api";
import { CitedText, type Citation } from "@/components/CitedText";

interface ConvSummary { id: string; title: string; shared: boolean }
interface Msg { role: string; content: string; citations: Citation[] }

/** Research chat as correspondence: your questions are memos,
 * Researchly replies with footnoted letters. */
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
      setError(tokens.access ? "Could not load your letters." : "Sign in to use research chat.");
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

  const startNew = () => {
    setActive(null);
    setMessages([]);
    setShareUrl(null);
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

  const signedOut = !tokens.access && error;

  return (
    <main className="min-h-screen bg-desk px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-8">
        {/* Correspondence file */}
        <aside className="flex flex-[1_1_240px] flex-col gap-2.5">
          <Link href="/" className="font-mono text-[22px] tracking-[0.18em] text-paper no-underline">
            RESEARCHLY
          </Link>
          <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-[#c9b48f]">CORRESPONDENCE FILE</p>
          <button
            onClick={startNew}
            className="min-h-[44px] border-[1.5px] border-dashed border-[#c9b48f] font-mono text-[13px] tracking-[0.12em] text-paper hover:bg-paper/10"
          >
            + START A NEW LETTER
          </button>
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className={`min-h-[44px] bg-[#e9dcbd] px-4 py-3 text-left text-[17px] text-ink shadow-card hover:bg-surface ${
                c.id === active ? "border-t-[3px] border-redink" : ""
              }`}
            >
              <span className="line-clamp-2">{c.title || "Untitled letter"}</span>
              {c.shared && <span className="mt-1 block font-mono text-[11px] text-muted">photocopied</span>}
            </button>
          ))}
        </aside>

        {/* Letters */}
        <section className="flex min-w-0 flex-[999_1_620px] flex-col gap-7">
          {signedOut && (
            <p className="text-[18px] italic text-paper">
              {error}{" "}
              <Link href="/login" className="text-[#f0b9a8]">Show your reader&apos;s card</Link>
            </p>
          )}

          {messages.length === 0 && !signedOut && (
            <div className="bg-paper px-8 py-10 shadow-sheet">
              <p className="type-label">A NEW LETTER</p>
              <p className="mt-3 text-[26px] italic">Write your first memo below.</p>
              <p className="mt-2 text-[17px] text-muted">
                Each memo starts a fresh search across all archives. Follow-up memos keep the context of the letter.
              </p>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className={`max-w-[460px] self-end bg-memo px-5 py-4 shadow-[inset_0_0_30px_rgba(140,100,30,0.25),0_10px_24px_rgba(0,0,0,0.45)] ${
                  i % 4 === 0 ? "rotate-[1.2deg]" : "-rotate-[0.8deg]"
                }`}
              >
                <p className="font-mono text-[11px] tracking-[0.14em] text-rule">MEMO · FROM: YOU</p>
                <p className="mt-1 text-[19px] leading-snug">{m.content}</p>
              </div>
            ) : (
              <article key={i} className="-rotate-[0.3deg] bg-paper px-6 py-8 shadow-sheet sm:px-12">
                <p className="font-mono text-[12px] tracking-[0.14em] text-muted">
                  FROM: RESEARCHLY ARCHIVE · RE: YOUR MEMO
                </p>
                <div className="mt-4 max-w-measure text-[19px] leading-[1.75]">
                  {m.content ? (
                    <CitedText text={m.content} citations={m.citations} />
                  ) : (
                    <span className="font-hand text-[24px] text-redink">consulting the archives…</span>
                  )}
                </div>
                {m.citations.length > 0 && (
                  <div className="mt-6 border-t border-dotted border-rule pt-3 text-[15px] leading-7 text-muted">
                    {m.citations.slice(0, 8).map((c) => (
                      <div key={c.n} className="flex gap-2">
                        <span className="font-mono text-redink">{c.n}</span>
                        <a href={c.url} target="_blank" rel="noreferrer" className="truncate text-muted no-underline hover:text-ink">
                          {c.title}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          )}

          {busy && <p className="font-hand text-[24px] text-[#e8cfa0]">the archive is typing a reply…</p>}
          {error && !signedOut && <p className="font-mono text-[13px] text-[#f0b9a8]">{error}</p>}

          {/* Typewriter */}
          {!signedOut && (
            <div className="mt-2">
              <div className="h-6 bg-[#1a120c]" aria-hidden />
              <div className="flex flex-col gap-3 bg-paper px-6 pb-5 pt-5 shadow-sheet">
                <label htmlFor="memo" className="type-label">WRITE YOUR NEXT MEMO</label>
                <textarea
                  id="memo"
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Ask a research question or a follow-up"
                  className="resize-none border-0 border-b-2 border-dashed border-rule bg-transparent font-mono text-[17px] text-ink outline-none placeholder:text-muted/70 focus:border-redink"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-5 font-mono text-[13px]">
                    <button
                      onClick={share}
                      disabled={!active}
                      className="min-h-[44px] text-muted underline hover:text-ink disabled:no-underline disabled:opacity-50"
                    >
                      Make a photocopy (share link)
                    </button>
                    <button
                      onClick={() => active && downloadText(`/export/conversations/${active}.md`, "letter.md")}
                      disabled={!active}
                      className="min-h-[44px] text-muted underline hover:text-ink disabled:no-underline disabled:opacity-50"
                    >
                      Export as Markdown
                    </button>
                  </div>
                  <button onClick={send} disabled={busy} className="stamp">
                    {busy ? "SENDING…" : "SEND MEMO"}
                  </button>
                </div>
                {shareUrl && (
                  <p className="font-mono text-[12px] text-ok">
                    Photocopy link copied: <span className="break-all">{shareUrl}</span>
                  </p>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>
      </div>
    </main>
  );
}
