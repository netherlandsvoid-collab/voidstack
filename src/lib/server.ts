import { EventEmitter } from "node:events";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { seedUsers, seedPosts, seedProducts } from "./seed";
const shared = globalThis as typeof globalThis & { nxEvents?: EventEmitter };
export const events = shared.nxEvents || (shared.nxEvents = new EventEmitter());
events.setMaxListeners(200);
mkdirSync(process.env.DATA_DIR || ".data", { recursive: true });
const db = new DatabaseSync(
  `${process.env.DATA_DIR || ".data"}/nexirel.sqlite`,
);
db.exec(
  `PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (kind TEXT, id TEXT, data TEXT NOT NULL, PRIMARY KEY(kind,id));`,
);
export function all(kind: string): any[] {
  return (
    db.prepare("SELECT data FROM records WHERE kind=?").all(kind) as {
      data: string;
    }[]
  ).map((r) => JSON.parse(r.data));
}
export function get(kind: string, id: string): any {
  const r = db
    .prepare("SELECT data FROM records WHERE kind=? AND id=?")
    .get(kind, id) as { data: string } | undefined;
  return r ? JSON.parse(r.data) : undefined;
}
export function put(kind: string, v: any) {
  db.prepare("INSERT OR REPLACE INTO records(kind,id,data) VALUES(?,?,?)").run(
    kind,
    v.id,
    JSON.stringify(v),
  );
  events.emit("change");
  return v;
}
export function del(kind: string, id: string) {
  db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id);
  events.emit("change");
}
export const uid = () => randomBytes(16).toString("hex");
export function hash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verify(password: string, stored: string) {
  const [salt, h] = stored.split(":");
  return timingSafeEqual(Buffer.from(h, "hex"), scryptSync(password, salt, 64));
}
export function publicUser(u: any) {
  if (!u) return null;
  const { password, email, ...safe } = u;
  return {
    ...safe,
    followers: all("follow").filter((f) => f.target === u.id).length,
  };
}
export function session(req: Request) {
  const token = req.headers
    .get("cookie")
    ?.match(/(?:^|; )nx_session=([^;]+)/)?.[1];
  const s = token ? get("session", token) : null;
  const user = s && s.expires > Date.now() ? get("user", s.userId) : null;
  return user && !user.disabled ? user : null;
}
export function requireUser(req: Request) {
  const u = session(req);
  if (!u) throw new Error("Please sign in to continue.");
  if (u.disabled) throw new Error("This account has been suspended.");
  return u;
}
export function notify(
  userId: string,
  actorId: string,
  text: string,
  target: string,
) {
  if (userId !== actorId)
    put("notification", {
      id: uid(),
      userId,
      actorId,
      text,
      target,
      read: false,
      createdAt: Date.now(),
    });
}
export function blocked(a: string, b: string) {
  return all("block").some(
    (x) =>
      (x.userId === a && x.target === b) || (x.userId === b && x.target === a),
  );
}
let signing = get("config", "signing");
if (!signing)
  signing = put("config", {
    id: "signing",
    key: randomBytes(32).toString("hex"),
  });
export function sign(value: string) {
  return createHmac("sha256", signing.key).update(value).digest("hex");
}
if (!get("config", "seeded")) {
  for (const u of seedUsers)
    put("user", { ...u, seed: true, createdAt: Date.now() });
  seedPosts.forEach((p, i) =>
    put("post", {
      ...p,
      seed: true,
      media: [p.image],
      createdAt: Date.now() - i * 3600000,
    }),
  );
  seedProducts.forEach((p) =>
    put("product", {
      ...p,
      seed: true,
      licence: "Personal use. No redistribution or resale of source files.",
      software: "See included documentation",
      createdAt: Date.now(),
    }),
  );
  put("config", { id: "seeded" });
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
if (!get("config", "local_art_v1")) {
  for (const u of seedUsers)
    if (get("user", u.id)?.seed)
      put("user", { ...get("user", u.id), avatar: u.avatar });
  for (const p of seedPosts)
    if (get("post", p.id)?.seed)
      put("post", { ...get("post", p.id), image: p.image, media: [p.image] });
  for (const p of seedProducts)
    if (get("product", p.id)?.seed)
      put("product", { ...get("product", p.id), image: p.image });
  put("config", { id: "local_art_v1" });
}
