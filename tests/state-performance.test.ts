import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { allMany } from "../src/lib/server";
import { GET } from "../src/app/api/[...path]/route";
const fixture = installSupabaseFixture();
after(() => fixture.restore());

test("guest feed uses one batched read and excludes account-only kinds", async () => {
  fixture.databaseReads.length = 0;
  const response = await GET(new Request("https://app.test/api/state"), {
    params: Promise.resolve({ path: ["state"] }),
  });
  assert.equal(response.status, 200);
  assert.equal(fixture.databaseReads.length, 1);
  const query = new URLSearchParams(fixture.databaseReads[0]);
  assert.equal(
    query.get("kind"),
    "in.(user,media,post,like,product,follow,comment)",
  );
  const state = await response.json();
  assert.equal(state.me, null);
  for (const key of [
    "orders",
    "sellerOrders",
    "messages",
    "notifications",
    "reports",
  ])
    assert.deepEqual(state[key], []);
  assert.ok(state.posts.length > 0);
});

test("batched reads keep pagination boundaries and database overrides of samples", async () => {
  for (let i = 0; i < 1005; i++) {
    const id = String(i).padStart(5, "0");
    fixture.records.set("like:" + id, {
      kind: "like",
      id,
      data: { id, target: "sample", userId: id },
    });
  }
  fixture.records.set("user:mila", {
    kind: "user",
    id: "mila",
    data: { id: "mila", name: "Updated creator" },
  });
  fixture.databaseReads.length = 0;
  const result = await allMany(["user", "like"]);
  assert.equal(fixture.databaseReads.length, 2);
  assert.equal(result.like.length, 1005);
  assert.equal(new Set(result.like.map((row) => row.id)).size, 1005);
  assert.equal(result.user.filter((row) => row.id === "mila").length, 1);
  assert.equal(
    result.user.find((row) => row.id === "mila").name,
    "Updated creator",
  );
});
