"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { CitedText, type Citation } from "@/components/CitedText";

interface SharedConv {
  title: string;
  messages: { role: string; content: string; citations: Citation[] }[];
}

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [conv, setConv] = useState<SharedConv | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SharedConv>(`/shared/${token}`).then(setConv).catch((e) => setError(e.message));
  }, [token]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-10 flex items-baseline justify-between border-b border-hairline pb-5">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          Nexus<span className="text-cobalt">.</span>
        </Link>
        <span className="text-xs uppercase tracking-wide text-muted">Shared research</span>
      </header>
      {error && <p className="text-sm text-muted">{error}</p>}
      {conv && (
        <>
          <h1 className="mb-8 font-display text-2xl font-medium leading-snug">{conv.title}</h1>
          <div className="space-y-8 pb-20">
            {conv.messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="font-display text-lg font-medium leading-snug">{m.content}</p>
              ) : (
                <div key={i} className="max-w-measure text-[15px] leading-[1.75] text-ink/90">
                  <CitedText text={m.content} citations={m.citations} />
                </div>
              )
            )}
          </div>
        </>
      )}
    </main>
  );
}
