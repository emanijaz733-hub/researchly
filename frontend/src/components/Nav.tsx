"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, tokens } from "@/lib/api";

/** Shared top navigation: wordmark, primary destinations, session state. */
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
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight">
        Nexus<span className="text-cobalt">.</span>
      </Link>
      <nav className="flex items-center gap-6 text-sm text-muted">
        <Link href="/chat" className="hover:text-ink">Chat</Link>
        <Link href="/library" className="hover:text-ink">Library</Link>
        {signedIn ? (
          <button onClick={signOut} className="hover:text-ink">Sign out</button>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-ink px-4 py-1.5 text-sm text-white transition-colors hover:bg-cobalt"
          >
            Sign in
          </Link>
        )}
        <kbd className="hidden rounded-md border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted sm:inline">
          Ctrl K
        </kbd>
      </nav>
    </header>
  );
}
