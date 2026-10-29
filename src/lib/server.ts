import { EventEmitter } from "node:events";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { seedUsers, seedPosts, seedProducts } from "./seed";

// Never initialize a database or write files at module import time.
const shared = globalThis as typeof globalThis & { nxEvents?: EventEmitter };
export const events = shared.nxEvents || (shared.nxEvents = new EventEmitter());
events.setMaxListeners(200);
export class BackendError extends Error {
  status = 503;
}
function config(name: string): string {
  const value = process.env[name];
  if (!value) throw new BackendError(`Server configuration missing: ${name}.`);
  return value;
}
export function database(): SupabaseClient {
  return createClient(
    config("NEXT_PUBLIC_SUPABASE_URL"),
    config("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
      },
    },
  );
}
function databaseError(error: { code?: string; message: string }): never {
  console.error("Supabase database:", error.code, error.message);
  if (error.code === "23505")
    throw new Error("That username is already taken.");
  throw new BackendError(
    "Database unavailable. Check the Supabase migration and server configuration.",
  );
}
const samples: Record<string, any[]> = {
  user: seedUsers.map((u) => ({ ...u, seed: true, createdAt: 0 })),
  post: seedPosts.map((p, i) => ({
    ...p,
    seed: true,
    media: [p.image],
    createdAt: 1700000000000 - i * 3600000,
  })),
  product: seedProducts.map((p) => ({
    ...p,
    seed: true,
    licence: "Personal use. No redistribution or resale of source files.",
    software: "See included documentation",
    createdAt: 1700000000000,
  })),
};
export async function all(kind: string): Promise<any[]> {
  const rows: any[] = [];
  // PostgREST caps individual pages; do not silently lose records above 1000.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await database()
      .from("voidstack_records")
      .select("id,data")
      .eq("kind", kind)
      .order("id")
      .range(offset, offset + 999);
    if (error) databaseError(error);
    rows.push(...data!.map((r) => r.data));
    if (data!.length < 1000) break;
  }
  const ids = new Set(rows.map((r) => r.id));
  return [...(samples[kind] || []).filter((r) => !ids.has(r.id)), ...rows];
}
export async function get(kind: string, id: string): Promise<any> {
  const { data, error } = await database()
    .from("voidstack_records")
    .select("data")
    .eq("kind", kind)
    .eq("id", id)
    .maybeSingle();
  if (error) databaseError(error);
  return data?.data || samples[kind]?.find((r) => r.id === id);
}
export async function put(kind: string, value: any): Promise<any> {
  const { error } = await database()
    .from("voidstack_records")
    .upsert({ kind, id: value.id, data: value }, { onConflict: "kind,id" });
  if (error) databaseError(error);
  events.emit("change");
  return value;
}
export async function del(kind: string, id: string) {
  const { error } = await database()
    .from("voidstack_records")
    .delete()
    .eq("kind", kind)
    .eq("id", id);
  if (error) databaseError(error);
  events.emit("change");
}
export const uid = () => randomBytes(16).toString("hex");
export async function publicUser(u: any) {
  if (!u) return null;
  const { password, email, ...safe } = u;
  return {
    ...safe,
    followers: (await all("follow")).filter((f) => f.target === u.id).length,
  };
}

type AuthContext = {
  client: SupabaseClient;
  headers: string[];
  user?: Promise<any>;
};
const authContext = new AsyncLocalStorage<AuthContext>();
export function authClient(): SupabaseClient {
  const context = authContext.getStore();
  if (!context) throw new Error("Authentication requires a request context.");
  return context.client;
}
// All authentication happens in route handlers. Persist every SSR token refresh
// back to the response, including errors and redirects. Never cache auth responses.
export async function withAuth(
  req: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const headers: string[] = [];
  const jar = new Map(
    parseCookieHeader(req.headers.get("cookie") || "").map((c) => [
      c.name,
      c.value,
    ]),
  );
  try {
    const client = createServerClient(
      config("NEXT_PUBLIC_SUPABASE_URL"),
      config("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      {
        cookieOptions: {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        },
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (cookies) => {
            for (const { name, value, options } of cookies) {
              jar.set(name, value);
              headers.push(serializeCookieHeader(name, value, options));
            }
          },
        },
      },
    );
    return await authContext.run({ client, headers }, async () => {
      let response: Response;
      try {
        response = await handler();
      } catch (error) {
        console.error(
          "API failure:",
          error instanceof Error ? error.message : "Unknown error",
        );
        response = Response.json(
          {
            error:
              error instanceof BackendError
                ? error.message
                : "The server could not complete your request.",
          },
          { status: 503 },
        );
      }
      // Native redirect responses have immutable headers. Copy before adding
      // session cookies so confirmation links can establish a session too.
      const outgoing = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
      for (const cookie of headers)
        outgoing.headers.append("set-cookie", cookie);
      outgoing.headers.set("Cache-Control", "private, no-store");
      return outgoing;
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof BackendError
            ? error.message
            : "Authentication is unavailable.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function session(_req: Request) {
  const context = authContext.getStore();
  if (!context) throw new Error("Authentication requires a request context.");
  context.user ||= (async () => {
    const { data, error } = await context.client.auth.getUser();
    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        error.status === 400 ||
        error.status === 401 ||
        error.status === 403
      )
        return null;
      throw new BackendError(
        "Authentication is unavailable. Please try again later.",
      );
    }
    if (!data.user) return null;
    const profile = await get("user", data.user.id);
    if (!profile)
      throw new BackendError(
        "Account profile is missing. Check the Supabase signup migration.",
      );
    return profile.disabled ? null : { ...profile, email: data.user.email };
  })();
  return context.user;
}
export async function requireUser(req: Request) {
  const u = await session(req);
  if (!u) throw new Error("Please sign in to continue.");
  return u;
}
export async function notify(
  userId: string,
  actorId: string,
  text: string,
  target: string,
) {
  if (userId !== actorId)
    await put("notification", {
      id: uid(),
      userId,
      actorId,
      text,
      target,
      read: false,
      createdAt: Date.now(),
    });
}
export async function blocked(a: string, b: string) {
  return (await all("block")).some(
    (x) =>
      (x.userId === a && x.target === b) || (x.userId === b && x.target === a),
  );
}
export function sign(value: string) {
  return createHmac("sha256", config("SUPABASE_SECRET_KEY"))
    .update(value)
    .digest("hex");
}
export function validateText(value: any, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Enter text between 1 and ${max} characters.`);
  return value.trim();
}
const limits = new Map<string, { n: number; time: number }>();
export function rate(req: Request) {
  const k = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now(),
    v = limits.get(k);
  if (!v || now - v.time > 60000) {
    limits.set(k, { n: 1, time: now });
    return;
  }
  if (++v.n > 100)
    throw new Error("Too many requests. Please try again in a minute.");
}
