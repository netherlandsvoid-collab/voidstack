import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { POST } from "../src/app/api/[...path]/route";
const fixture = installSupabaseFixture();
process.env.APP_URL = "https://app.test";
after(() => fixture.restore());
function request(
  path: string,
  body: any,
  cookie = "",
  origin = "https://app.test",
) {
  return POST(
    new Request(`https://app.test/api/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "app.test",
        origin,
        cookie,
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ path: [path] }) },
  );
}
async function account(username: string) {
  const email = `${username}@example.com`,
    password = "original password 123";
  const res = await request("register", {
    email,
    password,
    name: username,
    username,
  });
  assert.equal(res.status, 200, await res.clone().text());
  return {
    email,
    password,
    cookie: res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function resetLink(email: string) {
  const res = await request("recover", { email });
  assert.equal(res.status, 200, await res.clone().text());
  return fixture.recoveryRequests.at(-1)!.tokenHash!;
}
const newPassword = "a different strong password 456";
const body = (tokenHash: string) => ({
  tokenHash,
  newPassword,
  confirmPassword: newPassword,
});

test("recovery sends a configured reset request without revealing account existence", async () => {
  const user = await account("recover_request");
  const known = await request("recover", {
    email: ` ${user.email.toUpperCase()} `,
  });
  const unknown = await request("recover", { email: "unknown@example.com" });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(fixture.recoveryRequests.at(-2)!.email, user.email);
  assert.equal(
    new URL(fixture.recoveryRequests.at(-2)!.redirectTo).pathname,
    "/reset-password",
  );
  assert.equal(
    new URL(fixture.recoveryRequests.at(-2)!.redirectTo).origin,
    "https://app.test",
  );
  assert.equal(fixture.recoveryRequests.at(-1)!.tokenHash, undefined);
  assert.equal((await request("recover", { email: "invalid" })).status, 400);
  assert.equal(
    (await request("recover", { email: user.email }, "", "https://evil.test"))
      .status,
    403,
  );
});

test("an emailed recovery token resets only its account without the old password and is single use", async () => {
  const owner = await account("recover_owner");
  const other = await account("recover_other");
  const hash = await resetLink(owner.email);
  assert.equal(
    (
      await request("reset-password", {
        ...body(hash),
        newPassword: "short",
        confirmPassword: "short",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("reset-password", {
        ...body(hash),
        confirmPassword: "mismatch",
      })
    ).status,
    400,
  );
  assert.ok(
    fixture.recoveryTokens.has(hash),
    "validation must not consume the email token",
  );
  const res = await request("reset-password", body(hash), other.cookie);
  assert.equal(res.status, 200, await res.clone().text());
  assert.match((await res.json()).message, /has been reset/);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.ok(
    res.headers.getSetCookie().some((c) => c.includes("Max-Age=0")),
    "recovery session is cleared",
  );
  assert.equal(
    (await request("login", { email: owner.email, password: owner.password }))
      .status,
    400,
  );
  assert.equal(
    (await request("login", { email: owner.email, password: newPassword }))
      .status,
    200,
  );
  assert.equal(
    (await request("login", { email: other.email, password: other.password }))
      .status,
    200,
  );
  assert.equal(
    (await request("reset-password", body(hash))).status,
    400,
    "token cannot be replayed",
  );
});

test("ordinary sessions, signup tokens, invalid and expired links cannot reset a password", async () => {
  const user = await account("recover_guard");
  for (const token of [
    "",
    "confirm-valid",
    "not_a_real_recovery_token_123456789",
  ])
    assert.equal(
      (await request("reset-password", body(token), user.cookie)).status,
      400,
    );
  const expired = await resetLink(user.email);
  fixture.recoveryTokens.delete(expired);
  assert.equal(
    (await request("reset-password", body(expired), user.cookie)).status,
    400,
  );
  assert.equal(
    (await request("login", { email: user.email, password: user.password }))
      .status,
    200,
  );
});

test("missing configuration and email-provider failures never claim that a reset email was sent", async () => {
  delete process.env.APP_URL;
  assert.equal(
    (await request("recover", { email: "a@example.com" })).status,
    503,
  );
  process.env.APP_URL = "https://app.test";
  fixture.setRecoveryFailure(500);
  const failure = await request("recover", { email: "a@example.com" });
  assert.equal(failure.status, 503);
  assert.match((await failure.json()).error, /could not be sent/);
  fixture.setRecoveryFailure(429);
  const limited = await request("recover", { email: "a@example.com" });
  assert.equal(limited.status, 400);
  assert.match((await limited.json()).error, /wait/);
  fixture.setRecoveryFailure(0);
});
