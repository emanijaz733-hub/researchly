"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, tokens } from "@/lib/api";
import { Nav } from "@/components/Nav";

interface Workspace { id: string; name: string }

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setWorkspaces(await api<Workspace[]>("/workspaces"));
    } catch (err) {
      setError(tokens.access ? (err as Error).message : "Sign in to manage workspaces.");
    }
  };
  useEffect(() => { void load(); }, []);

  const createWorkspace = async () => {
    const name = window.prompt("Workspace name:");
    if (!name) return;
    await api("/workspaces", { method: "POST", body: JSON.stringify({ name }) });
    await load();
  };

  const createCollection = async (workspaceId: string) => {
    const name = window.prompt("Collection name:");
    if (!name) return;
    await api("/collections", { method: "POST",
      body: JSON.stringify({ name, workspace_id: workspaceId }) });
  };

  return (
    <main className="mx-auto max-w-3xl px-5">
      <Nav />
      <div className="mb-8 border-b border-hairline pb-4 pt-4">
        <h1 className="font-display text-2xl font-medium">Workspaces</h1>
      </div>
      {error && <p className="text-sm text-muted">{error}{" "}
        <Link href="/login" className="text-cobalt underline-offset-2 hover:underline">Sign in</Link></p>}
      {!error && (
        <>
          <button onClick={createWorkspace}
            className="mb-5 rounded-xl border border-hairline bg-surface px-5 py-2.5 text-sm font-medium shadow-card transition-colors hover:border-cobalt/40">
            New workspace
          </button>
          <div className="flex flex-col gap-3 pb-20">
            {workspaces.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-4 shadow-card">
                <span className="text-sm font-medium">{w.name}</span>
                <button onClick={() => createCollection(w.id)}
                  className="text-xs text-muted hover:text-ink">Add collection</button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
