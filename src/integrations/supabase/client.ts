// Backward-compat shim: exposes a `supabase`-shaped client that talks to our
// MongoDB-backed Express API. The frontend keeps its existing call sites.
import { api, getToken, setToken, clearToken } from "@/lib/api";

type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "INITIAL_SESSION"
  | "PASSWORD_RECOVERY";

interface User {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}
interface Session {
  user: User;
  access_token: string;
}

const STORAGE_KEY = "ai-mentor-auth";

const readStored = (): { user: User; token: string } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStored = (user: User, token: string) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  setToken(token);
};

const clearStored = () => {
  localStorage.removeItem(STORAGE_KEY);
  clearToken();
};

// hydrate token on load
const initial = readStored();
if (initial) setToken(initial.token);

type Listener = (event: AuthEvent, session: Session | null) => void;
const listeners = new Set<Listener>();
const emit = (event: AuthEvent, session: Session | null) => {
  listeners.forEach((cb) => {
    try { cb(event, session); } catch { /* noop */ }
  });
};

const sessionFrom = (user: User, token: string): Session => ({ user, access_token: token });

const ok = <T>(data: T) => ({ data, error: null as null });
const fail = (message: string, code?: string) => ({ data: null, error: { message, code: code ?? "" } });

// --- Auth ---
const auth = {
  async getSession() {
    const stored = readStored();
    if (!stored) return { data: { session: null }, error: null };
    return { data: { session: sessionFrom(stored.user, stored.token) }, error: null };
  },
  async getUser() {
    const stored = readStored();
    if (!stored) return { data: { user: null }, error: null };
    try {
      const fresh = await api<User>("/profile/me", { method: "GET" });
      // refresh local user metadata cache
      writeStored(fresh, stored.token);
      return { data: { user: fresh }, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Auth error";
      // token invalid → wipe
      clearStored();
      return { data: { user: null }, error: { message: msg } };
    }
  },
  async signUp(input: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    try {
      const res = await api<{ user: User; token: string }>("/auth", {
        method: "POST",
        body: { email: input.email, password: input.password, full_name: input.options?.data?.full_name },
      });
      writeStored(res.user, res.token);
      const session = sessionFrom(res.user, res.token);
      emit("SIGNED_IN", session);
      return { data: { user: res.user, session }, error: null };
    } catch (e: unknown) {
      return { data: { user: null, session: null }, error: { message: e instanceof Error ? e.message : "Signup failed" } };
    }
  },
  async signInWithPassword(input: { email: string; password: string }) {
    try {
      const res = await api<{ user: User; token: string }>("/auth", {
        method: "POST",
        body: { email: input.email, password: input.password },
      });
      writeStored(res.user, res.token);
      const session = sessionFrom(res.user, res.token);
      emit("SIGNED_IN", session);
      return { data: { user: res.user, session }, error: null };
    } catch (e: unknown) {
      return { data: { user: null, session: null }, error: { message: e instanceof Error ? e.message : "Invalid login credentials" } };
    }
  },
  async signOut() {
    clearStored();
    emit("SIGNED_OUT", null);
    return { error: null };
  },
  async resetPasswordForEmail(_email: string, _opts?: unknown) {
    return { error: { message: "Password reset is not configured on this backend." } };
  },
  async updateUser(input: { password?: string; data?: Record<string, unknown> }) {
    try {
      const stored = readStored();
      if (!stored) return { error: { message: "Not signed in" } };
      const res = await api<User>("/auth/update", { method: "POST", body: input });
      writeStored(res, stored.token);
      return { error: null };
    } catch (e: unknown) {
      return { error: { message: e instanceof Error ? e.message : "Update failed" } };
    }
  },
  onAuthStateChange(cb: Listener) {
    listeners.add(cb);
    // emit current state
    const stored = readStored();
    queueMicrotask(() => cb("INITIAL_SESSION", stored ? sessionFrom(stored.user, stored.token) : null));
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
};

// --- from() table router ---
type Row = Record<string, unknown>;

class QueryBuilder {
  private table: string;
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private filters: Array<{ col: string; op: "eq" | "in"; val: unknown }> = [];
  private payload: unknown = null;
  private singleRow = false;
  private orderBy: Array<{ col: string; ascending: boolean }> = [];
  private upsertOpts: { onConflict?: string } = {};

  constructor(table: string) { this.table = table; }

  select(_cols?: string) { return this; }
  eq(col: string, val: unknown) { this.filters.push({ col, op: "eq", val }); return this; }
  in(col: string, val: unknown[]) { this.filters.push({ col, op: "in", val }); return this; }
  order(col: string, opts: { ascending: boolean }) { this.orderBy.push({ col, ascending: opts.ascending }); return this; }
  single() { this.singleRow = true; return this.then(undefined as never, undefined as never); }
  insert(payload: Row | Row[]) { this.op = "insert"; this.payload = payload; return this; }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) { this.op = "upsert"; this.payload = payload; this.upsertOpts = opts ?? {}; return this; }
  update(payload: Row) { this.op = "update"; this.payload = payload; return this; }
  delete() { this.op = "delete"; return this; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as never, onrejected as never);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async execute(): Promise<{ data: any; error: any }> {
    try {
      const body = {
        op: this.op,
        filters: this.filters,
        payload: this.payload,
        order: this.orderBy,
        single: this.singleRow,
        upsertOpts: this.upsertOpts,
      };
      const res = await api<unknown>(`/db/${this.table}`, { method: "POST", body });
      return { data: res, error: null };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Query failed";
      // Map "not found single" to PGRST116 so callers detect it
      const code = /not\s*found/i.test(message) ? "PGRST116" : "";
      return { data: null, error: { message, code } };
    }
  }
}

const from = (table: string) => new QueryBuilder(table);

// --- storage (data-URL based, since edge has no S3) ---
const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string, file: File, _opts?: unknown) {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error("read failed"));
          r.readAsDataURL(file);
        });
        try {
          await api<{ ok: true }>("/storage/upload", { method: "POST", body: { path, dataUrl } });
          return { data: { path }, error: null };
        } catch (e: unknown) {
          return { data: null, error: { message: e instanceof Error ? e.message : "upload failed" } };
        }
      },
      getPublicUrl(path: string) {
        const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/api$/, "");
        return { data: { publicUrl: `${base}/uploads/${encodeURIComponent(path)}` } };
      },
      async remove(_paths: string[]) {
        return { data: null, error: null };
      },
    };
  },
};

export const supabase = { auth, from, storage };
export type { Session, User };
export { getToken };
