"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, tokens } from "@/lib/api";
import { Nav } from "@/components/Nav";

interface Workspace { id: string; name: string }

/** Workspaces as manila case files. */
export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setWorkspaces(await api<Workspace[]>("/workspaces"));
    } catch (err) {
      setError(tokens.access ? (err as Error).message : "Sign in to manage your case files.");
    }
  };
  useEffect(() => { void load(); }, []);

  const createWorkspace = async () => {
    const name = window.prompt("Name for the new case file:");
    if (!name) return;
    await api("/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    await load();
  };

  const createCollection = async (workspace: Workspace) => {
    const name = window.prompt(`New collection inside "${workspace.name}":`);
    if (!name) return;
    await api("/collections", { method: "POST",
      body: JSON.stringify({ name, workspace_id: workspace.id }) });
    setNotice(`Added “${name}” to ${workspace.name}.`);
  };

  /* Stagger the folder tabs like a real filing drawer. */
  const tabOffset = ["ml-0", "ml-[27%]", "ml-[54%]"];

  return (
    <main className="mx-auto max-w-6xl px-5 sm:px-10">
      <Nav />

      <div className="pb-8 pt-8">
        <p className="type-label">RESEARCHLY</p>
        <h1 className="text-[40px] italic leading-tight">Your case files</h1>
      </div>

      {error && (
        <p className="text-[18px] italic text-muted">
          {error}{" "}
          <Link href="/login" className="text-redink">Show your reader&apos;s card</Link>
        </p>
      )}

      {notice && <p className="mb-6 font-mono text-[13px] text-ok">{notice}</p>}

      {!error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-8 gap-y-11 pb-24">
          {workspaces.map((w, i) => (
            <div key={w.id}>
              <div
                className={`flex h-[30px] w-[46%] items-center truncate bg-[#d6b276] pl-3.5 font-mono text-[12px] uppercase shadow-[inset_0_0_14px_rgba(120,80,20,0.25)] ${tabOffset[i % 3]}`}
              >
                {w.name}
              </div>
              <div className="flex h-[200px] flex-col justify-between bg-[#d6b276] px-5 py-5 shadow-[inset_0_0_40px_rgba(120,80,20,0.28),0_14px_26px_rgba(0,0,0,0.25)]">
                <p className="mt-6 text-[24px] leading-tight">{w.name}</p>
                <button
                  onClick={() => createCollection(w)}
                  className="min-h-[44px] self-start font-mono text-[13px] text-[#4e3e2a] underline hover:text-ink"
                >
                  + add a collection
                </button>
              </div>
            </div>
          ))}

          <button onClick={createWorkspace} className="text-left">
            <div className="h-[30px] w-[46%] border-[1.5px] border-b-0 border-dashed border-rule" />
            <div className="flex h-[200px] items-center justify-center border-[1.5px] border-dashed border-rule font-mono text-[14px] tracking-[0.14em] text-muted hover:text-ink">
              + OPEN A NEW CASE FILE
            </div>
          </button>
        </div>
      )}
    </main>
  );
}
