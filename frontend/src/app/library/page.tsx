"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, downloadText, tokens } from "@/lib/api";
import { Nav } from "@/components/Nav";

interface Bookmark {
  id: string; url: string; title: string; snippet: string; provider: string; note: string;
}
interface Note { id: string; title: string; content: string }

/** Lined notebook paper. */
const LINED =
  "bg-[#fbf6e6] bg-[repeating-linear-gradient(transparent_0_31px,rgba(70,110,160,0.28)_31px_32px)]";

export default function LibraryPage() {
  const [tab, setTab] = useState<"sources" | "notebook">("sources");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);

  const load = async () => {
    try {
      setBookmarks(await api<Bookmark[]>("/bookmarks"));
      setNotes(await api<Note[]>("/notes"));
    } catch (err) {
      setError(tokens.access ? (err as Error).message : "Sign in to see your library.");
    }
  };
  useEffect(() => { void load(); }, []);

  const removeBookmark = async (id: string) => {
    await api(`/bookmarks/${id}`, { method: "DELETE" });
    setBookmarks((b) => b.filter((x) => x.id !== id));
  };

  const annotate = async (id: string) => {
    const current = bookmarks.find((b) => b.id === id);
    const note = window.prompt("Annotation for this source:", current?.note ?? "");
    if (note === null) return;
    await api(`/bookmarks/${id}/annotation`, { method: "PATCH", body: JSON.stringify({ note }) });
    setBookmarks((b) => b.map((x) => (x.id === id ? { ...x, note } : x)));
  };

  const saveNote = async () => {
    if (!editing) return;
    if (editing.id) {
      await api(`/notes/${editing.id}`, { method: "PUT",
        body: JSON.stringify({ title: editing.title, content: editing.content }) });
    } else {
      await api("/notes", { method: "POST",
        body: JSON.stringify({ title: editing.title || "Untitled note", content: editing.content }) });
    }
    setEditing(null);
    await load();
  };

  const removeNote = async (id: string) => {
    await api(`/notes/${id}`, { method: "DELETE" });
    setNotes((n) => n.filter((x) => x.id !== id));
  };

  /* One catalog drawer per provider. */
  const drawers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) counts.set(b.provider, (counts.get(b.provider) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bookmarks]);

  const shown = drawer ? bookmarks.filter((b) => b.provider === drawer) : bookmarks;

  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-10">
      <Nav />

      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-8">
        <div>
          <p className="type-label">RESEARCHLY</p>
          <h1 className="text-[40px] italic leading-tight">Your library</h1>
        </div>
        <div className="flex flex-wrap items-center gap-5 font-mono text-[14px]">
          {(["sources", "notebook"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`min-h-[44px] ${
                t === tab ? "text-ink underline decoration-redink underline-offset-[6px]" : "text-muted hover:text-ink"
              }`}
            >
              {t === "sources" ? "Card catalog" : "Notebook"}
            </button>
          ))}
          <button
            onClick={() =>
              downloadText(
                tab === "sources" ? "/export/bookmarks.md" : "/export/notes.md",
                tab === "sources" ? "sources.md" : "notebook.md"
              )
            }
            className="min-h-[44px] bg-ink px-4 text-paper hover:bg-redink"
          >
            Check out as Markdown
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[18px] italic text-muted">
          {error}{" "}
          <Link href="/login" className="text-redink">Show your reader&apos;s card</Link>
        </p>
      )}

      {tab === "sources" && !error && (
        <div className="flex flex-wrap items-start gap-8 pb-24">
          {/* Wooden card catalog */}
          <section className="flex-[1_1_280px]" aria-label="Card catalog drawers">
            <div className="grid grid-cols-2 gap-2.5 bg-[#2a1a0e] p-2.5 shadow-overlay">
              <button
                onClick={() => setDrawer(null)}
                className={`flex min-h-[84px] flex-col items-center justify-center gap-2 bg-[#6b4428] hover:bg-[#7a4f2f] ${
                  drawer === null ? "outline outline-2 outline-[#c9a24c]" : ""
                }`}
              >
                <span className="bg-[#c9a24c] px-3 py-0.5 font-mono text-[12px] text-[#2b1a0c]">
                  ALL · {bookmarks.length}
                </span>
                <span className="h-2 w-7 rounded bg-[#c9a24c]" aria-hidden />
              </button>
              {drawers.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => setDrawer(name)}
                  className={`flex min-h-[84px] flex-col items-center justify-center gap-2 bg-[#6b4428] hover:bg-[#7a4f2f] ${
                    drawer === name ? "outline outline-2 outline-[#c9a24c]" : ""
                  }`}
                >
                  <span className="bg-[#c9a24c] px-3 py-0.5 font-mono text-[12px] uppercase text-[#2b1a0c]">
                    {name} · {count}
                  </span>
                  <span className="h-2 w-7 rounded bg-[#c9a24c]" aria-hidden />
                </button>
              ))}
            </div>
          </section>

          {/* Index cards from the open drawer */}
          <section className="min-w-0 flex-[999_1_520px]" aria-label="Index cards">
            <h2 className="type-label mb-3">
              OPEN DRAWER — {drawer ? drawer.toUpperCase() : "ALL SOURCES"}
            </h2>
            {shown.length === 0 && (
              <p className="text-[18px] italic text-muted">
                This drawer is empty. Run a search and press “+ file in library” on any source.
              </p>
            )}
            <div className="flex flex-col gap-4">
              {shown.map((b, i) => (
                <article
                  key={b.id}
                  className={`border-t-[3px] border-redink bg-[#f6eedb] px-5 py-4 shadow-[0_2px_0_rgba(0,0,0,0.12),0_8px_18px_rgba(0,0,0,0.18)] ${
                    i % 2 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-3 font-mono text-[12px] text-muted">
                    <span>CALL NO. {b.id.slice(0, 8).toUpperCase()}</span>
                    <span>{b.provider}</span>
                  </div>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-[20px] leading-snug text-ink no-underline hover:text-redink"
                  >
                    {b.title}
                  </a>
                  {b.snippet && (
                    <p className="mt-1.5 line-clamp-2 text-[16px] leading-6 text-muted">{b.snippet}</p>
                  )}
                  {b.note && <p className="mt-2 font-hand text-[22px] text-redink">{b.note}</p>}
                  <div className="mt-2 flex gap-5 font-mono text-[12px]">
                    <button onClick={() => annotate(b.id)} className="min-h-[32px] text-muted hover:text-ink">
                      {b.note ? "edit note" : "+ add a note"}
                    </button>
                    <button onClick={() => removeBookmark(b.id)} className="min-h-[32px] text-muted hover:text-danger">
                      remove card
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === "notebook" && !error && (
        <div className="flex flex-col gap-6 pb-24">
          {editing ? (
            <div className={`${LINED} max-w-3xl px-7 py-6 shadow-overlay`}>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Page title"
                aria-label="Note title"
                className="mb-2 w-full border-0 border-b-2 border-dashed border-rule bg-transparent pb-1 text-[24px] italic outline-none focus:border-redink"
              />
              <textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="Write your research notes"
                aria-label="Note content"
                rows={10}
                className="w-full resize-y border-0 bg-transparent font-hand text-[24px] leading-[32px] text-[#24384f] outline-none"
              />
              <div className="mt-3 flex items-center gap-5">
                <button onClick={saveNote} className="stamp">SAVE PAGE</button>
                <button onClick={() => setEditing(null)} className="font-mono text-[13px] text-muted hover:text-ink">
                  cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing({ id: "", title: "", content: "" })}
              className="min-h-[48px] max-w-3xl border-[1.5px] border-dashed border-rule font-mono text-[14px] tracking-[0.12em] text-muted hover:text-ink"
            >
              + START A NEW PAGE
            </button>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
            {notes.map((n, i) => (
              <article
                key={n.id}
                className={`${LINED} px-6 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.2)] ${
                  i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[20px] italic">{n.title}</h3>
                  <div className="flex shrink-0 gap-3 font-mono text-[12px] text-muted">
                    <button onClick={() => setEditing(n)} className="hover:text-ink">edit</button>
                    <button onClick={() => removeNote(n.id)} className="hover:text-danger">tear out</button>
                  </div>
                </div>
                {n.content && (
                  <p className="mt-1 line-clamp-6 whitespace-pre-wrap font-hand text-[22px] leading-[32px] text-[#24384f]">
                    {n.content}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
