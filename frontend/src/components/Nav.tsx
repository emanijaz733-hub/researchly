"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, tokens } from "@/lib/api";

/** Masthead: typewriter wordmark, destinations, session state. */
export function Nav() {
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSignedIn(Boolean(tokens.access));
  }, []);

  const signOut = async () => {
    try {
      if (tokens.refresh) {
        await api("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: tokens.refresh }),
        });
      }
    } catch {
      /* token may already be expired; local sign-out still proceeds */
    }
    tokens.clear();
    setSignedIn(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/" className="font-mono text-[32px] tracking-[0.18em] text-ink no-underline">
            RESEARCHLY
          </Link>
          <span className="text-[15px] italic text-muted">
            Research notebook · every claim footnoted
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 font-mono text-[14px]">
          <Link href="/chat" className="text-muted no-underline hover:text-ink">Chat</Link>
          <Link href="/library" className="text-muted no-underline hover:text-ink">Library</Link>
          <Link href="/workspaces" className="text-muted no-underline hover:text-ink">Workspaces</Link>
          {signedIn ? (
            <button onClick={signOut} className="text-muted hover:text-ink">
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center bg-ink px-4 text-paper no-underline hover:bg-redink"
            >
              Sign in
            </Link>
          )}
          <kbd className="hidden border border-rule px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline">
            Ctrl K
          </kbd>
        </nav>
      </div>
      <div className="double-rule mt-5" />
    </header>
  );
}
