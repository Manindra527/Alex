// Tiny fetch wrapper for our Express + MongoDB backend.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

let inMemoryToken: string | null = null;

export const setToken = (t: string | null) => { inMemoryToken = t; };
export const getToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  try {
    const raw = localStorage.getItem("ai-mentor-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch { return null; }
};
export const clearToken = () => { inMemoryToken = null; };

interface ApiOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, opts: ApiOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
      ? (data as { error: string }).error
      : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
