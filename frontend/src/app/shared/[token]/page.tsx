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

/** A shared conversation, shown as a read-only photocopy. */
export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [conv, setConv] = useState<SharedConv | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SharedConv>(`/shared/${token}`).then(setConv).catch((e) => setError(e.message));
  }, [token]);

  return (
    <main className="min-h-screen bg-[#3a3631] px-5 py-16">
      <div className="relative mx-auto max-w-3xl">
        {/* Paperclip */}
        <svg
          className="absolute -top-9 left-14 z-10 h-24 w-10"
          viewBox="0 0 40 96"
          aria-hidden
        >
          <path
            d="M10 70 V16 a10 10 0 0 1 20 0 V80 a14 14 0 0 1 -28 0 V30"
            fill="none"
            stroke="#9a9a96"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative rotate-[0.5deg] bg-[#e9e7e1] px-6 pb-14 pt-16 text-[#1d1d1b] shadow-[0_26px_50px_rgba(0,0,0,0.55)] sm:px-16">
          <div className="absolute right-8 top-8 -rotate-[10deg] border-[3px] border-redink px-3 py-1 font-mono text-[15px] tracking-[0.18em] text-redink">
            COPY · READ ONLY
          </div>

          <p className="font-mono text-[13px] tracking-[0.14em] text-[#4a4a46]">
            RESEARCHLY · SHARED RESEARCH
          </p>

          {error && <p className="mt-8 text-[18px] italic">{error}</p>}

          {conv && (
            <>
              <h1 className="mb-8 mt-5 max-w-xl text-[34px] italic leading-tight">{conv.title}</h1>
              <div className="space-y-8">
                {conv.messages.map((m, i) =>
                  m.role === "user" ? (
                    <p key={i} className="border-l-0 text-[22px] italic leading-snug">
                      {m.content}
                    </p>
                  ) : (
                    <div key={i} className="max-w-measure text-[19px] leading-[1.75]">
                      <CitedText text={m.content} citations={m.citations} />
                    </div>
                  )
                )}
              </div>
              <p className="mt-10 font-mono text-[12px] text-[#5a5a56]">
                Copied from a reader&apos;s Researchly notebook
              </p>
            </>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center bg-paper px-6 font-mono text-[14px] tracking-[0.12em] text-ink no-underline hover:bg-surface"
          >
            START YOUR OWN RESEARCH
          </Link>
        </div>
      </div>
    </main>
  );
}
