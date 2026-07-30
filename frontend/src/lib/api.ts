/** API client: JSON requests, token storage, and SSE stream parsing. */

const BASE = "/api/v1";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export const tokens = {
  get access(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("nexus.access");
  },
  get refresh(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("nexus.refresh");
  },
  set(pair: TokenPair) {
    sessionStorage.setItem("nexus.access", pair.access_token);
    sessionStorage.setItem("nexus.refresh", pair.refresh_token);
  },
  clear() {
    sessionStorage.removeItem("nexus.access");
    sessionStorage.removeItem("nexus.refresh");
  },
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface SSEEvent {
  event: string;
  data: unknown;
}

/** POST to an SSE endpoint and invoke onEvent for each server event. */
export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (e: SSEEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (data) {
        try {
          onEvent({ event, data: JSON.parse(data) });
        } catch {
          /* skip malformed frame */
        }
      }
    }
  }
}

/** Download an authenticated endpoint's text response as a file. */
export async function downloadText(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
