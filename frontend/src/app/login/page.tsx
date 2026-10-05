"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, tokens, type TokenPair } from "@/lib/api";

/** Sign in / sign up as a library reader's card. */
export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = mode === "login" ? { email, password } : { email, name, password };
      const pair = await api<TokenPair>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      tokens.set(pair);
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date()
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .toUpperCase();

  const field =
    "w-full border-0 border-b-[1.5px] border-rule bg-transparent py-2 font-mono text-[17px] text-ink outline-none placeholder:text-muted/60 focus:border-b-2 focus:border-redink";

  return (
    <main className="flex min-h-screen flex-col items-center bg-desk px-5 py-16">
      <Link href="/" className="mb-10 font-mono text-[24px] tracking-[0.18em] text-paper no-underline">
        RESEARCHLY
      </Link>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="w-full max-w-[560px] -rotate-1 bg-[#f0e2bd] pb-9 shadow-sheet"
      >
        <div className="bg-redink px-8 py-3.5 font-mono text-[13px] tracking-[0.22em] text-[#f6ead0]">
          RESEARCHLY RESEARCH ARCHIVE
        </div>

        <div className="flex flex-col gap-5 px-8 pt-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[34px] italic leading-tight">
              {mode === "login" ? "Reader’s card" : "Apply for a card"}
            </h1>
            <div className="flex h-[70px] w-[96px] shrink-0 rotate-6 flex-col items-center justify-center border-[1.5px] border-rule text-center font-mono text-[11px] text-redink">
              {mode === "login" ? "ADMITTED" : "ISSUED"}
              <span>{today}</span>
            </div>
          </div>

          {mode === "register" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="type-label !text-[12px]">READER&apos;S NAME</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={field} autoComplete="name" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="type-label !text-[12px]">READER&apos;S EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              className={field}
              autoComplete="email"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="type-label !text-[12px]">PASSWORD</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 or more characters"
              className={field}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="font-mono text-[13px] text-redink">{error}</p>}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="min-h-[44px] font-hand text-[22px] text-redink hover:text-redink-deep"
            >
              {mode === "login" ? "new here? apply for a card" : "already a reader? sign in"}
            </button>
            <button type="submit" disabled={busy} className="stamp">
              {busy ? "CHECKING…" : mode === "login" ? "ENTER THE ARCHIVE" : "ISSUE MY CARD"}
            </button>
          </div>

          <p className="text-[14px] italic text-muted">
            This card is not transferable. Readers are responsible for the sources they borrow.
          </p>
        </div>
      </form>
    </main>
  );
}
