import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { POST, GET } from "../src/app/api/[...path]/route";
import { GET as health } from "../src/app/api/health/route";
import { GET as confirm } from "../src/app/auth/confirm/route";
import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
const fixture = installSupabaseFixture();
after(() => fixture.restore());
const context = (path: string) => ({
  params: Promise.resolve({ path: [path] }),
});
const call = (path: string, body: any, cookie = "") =>
  POST(
    new Request("https://app.test/api/" + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "app.test",
        origin: "https://app.test",
        cookie,
      },
      body: JSON.stringify(body),
    }),
    context(path),
  );
const account = (suffix: string) => ({
  name: "Test " + suffix,
  username: "user_" + suffix,
  email: suffix + "@example.com",
  password: "a password with spaces ",
});
const cookies = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

test("Supabase signup, session, login, logout, access controls, and profile persistence", async () => {
  const credentials = account("happy");
  const signup = await call("register", credentials);
  assert.equal(signup.status, 200, await signup.clone().text());
  const data = await signup.json();
  assert.ok(data.user.id);
  assert.equal(data.user.password, undefined);
  assert.equal(data.user.email, undefined);
  const cookie = cookies(signup);
  assert.ok(cookie.includes("sb-fixture-auth-token"));
  assert.ok(signup.headers.getSetCookie().every((c) => c.includes("HttpOnly")));
  const state = await GET(
    new Request("https://app.test/api/state", { headers: { cookie } }),
    context("state"),
  );
  assert.equal((await state.json()).me.username, credentials.username);
  const update = await call(
    "profile",
    { name: "Updated Name", bio: "Saved in Postgres" },
    cookie,
  );
  assert.equal(update.status, 200);
  assert.equal(
    fixture.records.get("user:" + data.user.id).data.name,
    "Updated Name",
  );
  assert.equal((await call("profile", { name: "Unauthorized" })).status, 400);
  assert.equal(
    (
      await call("register", {
        ...account("other"),
        username: credentials.username,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("login", {
        email: credentials.email,
        password: "wrong password",
      })
    ).status,
    400,
  );
  const login = await call("login", credentials);
  assert.equal(login.status, 200, await login.clone().text());
  assert.ok(cookies(login));
  const logout = await call("logout", {}, cookie);
  assert.equal(logout.status, 200);
  assert.ok(logout.headers.getSetCookie().some((c) => c.includes("Max-Age=0")));
  assert.equal(
    fixture.records.get("user:" + data.user.id).data.name,
    "Updated Name",
  );
});
test("email confirmation returns a pending state without false login success", async () => {
  fixture.setConfirmationRequired(true);
  const response = await call("register", account("confirm"));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).confirmationRequired, true);
  assert.ok(
    response.headers
      .getSetCookie()
      .every((c) => c.includes("code-verifier") || c.includes("Max-Age=0")),
  );
  assert.equal((await call("login", account("confirm"))).status, 400);
  const verified = await confirm(
    new Request(
      "https://app.test/auth/confirm?token_hash=confirm-valid&type=email",
    ),
  );
  assert.equal(verified.status, 303);
  assert.equal(verified.headers.get("location"), "https://app.test/");
  assert.ok(cookies(verified));
  assert.equal((await call("login", account("confirm"))).status, 200);
  const expired = await confirm(
    new Request("https://app.test/auth/confirm?token_hash=expired&type=email"),
  );
  assert.equal(expired.status, 400);
  fixture.setConfirmationRequired(false);
});
test("missing server configuration and database failures return JSON 503", async () => {
  const key = process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  const missing = await call("register", account("missing"));
  assert.equal(missing.status, 503);
  assert.match((await missing.json()).error, /SUPABASE_SECRET_KEY/);
  process.env.SUPABASE_SECRET_KEY = key;
  fixture.setUnavailable(true);
  const response = await call("register", account("offline"));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Database unavailable/);
  assert.equal((await health()).status, 503);
  fixture.setUnavailable(false);
});

test("expired sessions refresh cookies and keep the account signed in", async () => {
  const signup = await call("register", account("refresh"));
  assert.equal(signup.status, 200);
  const jar = parseCookieHeader(cookies(signup));
  const entry = jar.find((c) => c.name === "sb-fixture-auth-token")!;
  assert.ok(entry);
  const saved = JSON.parse(
    Buffer.from(entry.value.slice("base64-".length), "base64url").toString(),
  );
  saved.expires_at = Math.floor(Date.now() / 1000) - 60;
  const parts = saved.access_token.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  payload.exp = saved.expires_at;
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  saved.access_token = parts.join(".");
  const staleCookie = serializeCookieHeader(
    entry.name,
    "base64-" + Buffer.from(JSON.stringify(saved)).toString("base64url"),
    {},
  );
  const response = await GET(
    new Request("https://app.test/api/state", {
      headers: { cookie: staleCookie },
    }),
    context("state"),
  );
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).me.username, "user_refresh");
  assert.ok(
    response.headers
      .getSetCookie()
      .some((c) => c.startsWith("sb-fixture-auth-token=")),
  );
});
