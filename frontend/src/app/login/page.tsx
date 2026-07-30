"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, tokens, type TokenPair } from "@/lib/api";

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
      const body =
        mode === "login" ? { email, password } : { email, name, password };
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

  const field =
    "rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm shadow-card outline-none transition-colors focus:border-cobalt/50";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <Link href="/" className="mb-10 text-center font-display text-2xl font-semibold tracking-tight">
        Nexus<span className="text-cobalt">.</span>
      </Link>

      <h1 className="mb-1 text-center font-display text-xl font-medium">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mb-8 text-center text-sm text-muted">
        {mode === "login"
          ? "Sign in to search, chat, and save sources."
          : "Free account. Your library stays yours."}
      </p>

      <div className="flex flex-col gap-3">
        {mode === "register" && (
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name" aria-label="Name" className={field} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Email" type="email" aria-label="Email" className={field} />
        <input value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password (8+ characters)" type="password" aria-label="Password"
          className={field} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button onClick={submit} disabled={busy}
          className="mt-1 rounded-xl bg-cobalt py-2.5 text-sm font-medium text-white transition-colors hover:bg-cobalt-deep disabled:opacity-50">
          {busy ? "One moment" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>

      <button
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
        className="mt-6 text-center text-sm text-muted hover:text-ink"
      >
        {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
