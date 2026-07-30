"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, downloadText, tokens } from "@/lib/api";
import { Nav } from "@/components/Nav";

interface Bookmark {
  id: string; url: string; title: string; snippet: string; provider: string; note: string;
}
interface Note { id: string; title: string; content: string }

export default function LibraryPage() {
  const [tab, setTab] = useState<"sources" | "notebook">("sources");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);

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

  const field =
    "w-full rounded-xl border border-hairline bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-cobalt/50";

  return (
    <main className="mx-auto max-w-3xl px-5">
      <Nav />
      <div className="mb-8 flex items-baseline justify-between border-b border-hairline pb-4 pt-4">
        <h1 className="font-display text-2xl font-medium">Library</h1>
        <div className="flex gap-5 text-sm">
          {(["sources", "notebook"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={t === tab ? "font-medium text-cobalt" : "text-muted hover:text-ink"}>
              {t === "sources" ? "Sources" : "Notebook"}
            </button>
          ))}
          <button
            onClick={() => downloadText(tab === "sources" ? "/export/bookmarks.md" : "/export/notes.md",
                                        tab === "sources" ? "sources.md" : "notebook.md")}
            className="text-muted hover:text-ink">Export</button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-muted">{error}{" "}
          <Link href="/login" className="text-cobalt underline-offset-2 hover:underline">Sign in</Link></p>
      )}

      {tab === "sources" && !error && (
        <div className="flex flex-col gap-3 pb-20">
          {bookmarks.length === 0 && (
            <p className="text-sm text-muted">
              Nothing saved yet. Run a search and press Save on any source.
            </p>
          )}
          {bookmarks.map((b) => (
            <div key={b.id} className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
              <div className="flex items-baseline justify-between gap-3">
                <a href={b.url} target="_blank" rel="noreferrer"
                   className="truncate text-sm font-medium hover:text-cobalt">{b.title}</a>
                <div className="flex shrink-0 gap-3 text-xs text-muted">
                  <button onClick={() => annotate(b.id)} className="hover:text-ink">Annotate</button>
                  <button onClick={() => removeBookmark(b.id)} className="hover:text-danger">Remove</button>
                </div>
              </div>
              {b.snippet && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{b.snippet}</p>}
              {b.note && (
                <p className="mt-2 border-l-2 border-cobalt/50 pl-2.5 text-xs italic text-ink/80">{b.note}</p>
              )}
              <span className="mt-2 block text-[11px] text-muted/70">{b.provider}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "notebook" && !error && (
        <div className="flex flex-col gap-3 pb-20">
          {editing ? (
            <div className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
              <input value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Note title" aria-label="Note title"
                className={`mb-2 ${field}`} />
              <textarea value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="Write your research notes" aria-label="Note content" rows={8}
                className={field} />
              <div className="mt-3 flex gap-4 text-sm">
                <button onClick={saveNote} className="font-medium text-cobalt hover:text-cobalt-deep">Save note</button>
                <button onClick={() => setEditing(null)} className="text-muted hover:text-ink">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditing({ id: "", title: "", content: "" })}
              className="rounded-xl border border-hairline bg-surface py-2.5 text-sm font-medium shadow-card transition-colors hover:border-cobalt/40">
              New note
            </button>
          )}
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-hairline bg-surface p-4 shadow-card">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{n.title}</h3>
                <div className="flex gap-3 text-xs text-muted">
                  <button onClick={() => setEditing(n)} className="hover:text-ink">Edit</button>
                  <button onClick={() => removeNote(n.id)} className="hover:text-danger">Delete</button>
                </div>
              </div>
              {n.content && <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-muted">{n.content}</p>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
