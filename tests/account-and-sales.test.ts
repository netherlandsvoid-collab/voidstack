import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { POST, GET } from "../src/app/api/[...path]/route";
import { GET as callback } from "../src/app/auth/callback/route";
const fixture = installSupabaseFixture();
process.env.APP_URL = "https://app.test";
after(() => fixture.restore());
const context = (path: string) => ({
  params: Promise.resolve({ path: [path] }),
});
const cookies = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
async function request(path: string, body: any, cookie = "") {
  return POST(
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
}
async function account(username: string) {
  const body = {
    name: username,
    username,
    email: username + "@example.com",
    password: "original password 123",
  };
  const response = await request("register", body);
  assert.equal(response.status, 200, await response.clone().text());
  return {
    ...body,
    id: (await response.json()).user.id,
    cookie: cookies(response),
  };
}
const state = (cookie = "") =>
  GET(
    new Request("https://app.test/api/state", { headers: { cookie } }),
    context("state"),
  );

test("password change verifies current password, rejects mismatch, and changes login credentials", async () => {
  const user = await account("password_user");
  const body = {
    currentPassword: user.password,
    newPassword: "new strong password 456",
    confirmPassword: "new strong password 456",
  };
  assert.equal((await request("account-password", body)).status, 400);
  assert.equal(
    (
      await request(
        "account-password",
        { ...body, currentPassword: "wrong password" },
        user.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "account-password",
        { ...body, confirmPassword: "different" },
        user.cookie,
      )
    ).status,
    400,
  );
  const changed = await request("account-password", body, user.cookie);
  assert.equal(changed.status, 200, await changed.clone().text());
  assert.match((await changed.json()).message, /changed/);
  assert.equal(
    (await request("login", { email: user.email, password: user.password }))
      .status,
    400,
  );
  assert.equal(
    (await request("login", { email: user.email, password: body.newPassword }))
      .status,
    200,
  );
  assert.equal(fixture.records.get("user:" + user.id).data.password, undefined);
});

test("email changes require current password and remain pending until the PKCE callback", async () => {
  const user = await account("email_user");
  const body = {
    email: "new-email@example.com",
    currentPassword: user.password,
  };
  assert.equal((await request("account-email", body)).status, 400);
  assert.equal(
    (
      await request(
        "account-email",
        { ...body, currentPassword: "wrong" },
        user.cookie,
      )
    ).status,
    400,
  );
  const change = await request("account-email", body, user.cookie);
  assert.equal(change.status, 200, await change.clone().text());
  assert.match((await change.json()).message, /confirmation/);
  const confirmedState = await (await state(user.cookie)).json();
  assert.equal(confirmedState.me.email, user.email);
  assert.ok(confirmedState.users.every((u: any) => u.email === undefined));
  const redirect = new URL(fixture.emailRequests.at(-1)!.redirectTo);
  assert.equal(redirect.origin, "https://app.test");
  assert.equal(redirect.pathname, "/auth/callback");
  const query = new URLSearchParams(redirect.search);
  query.set("code", "email-change-valid");
  const response = await callback(
    new Request("https://app.test/auth/callback?" + query, {
      headers: { cookie: user.cookie + "; " + cookies(change) },
    }),
  );
  assert.equal(response.status, 303, await response.clone().text());
  assert.ok(cookies(response));
  assert.equal(
    (await (await state(cookies(response))).json()).me.email,
    body.email,
  );
  assert.equal(
    (await request("login", { email: user.email, password: user.password }))
      .status,
    400,
  );
  assert.equal(
    (await request("login", { email: body.email, password: user.password }))
      .status,
    200,
  );
});

test("profile username changes are unique and leave other users unchanged", async () => {
  const first = await account("name_first"),
    second = await account("name_second");
  assert.equal(
    (
      await request(
        "profile",
        { name: "First", username: second.username },
        first.cookie,
      )
    ).status,
    400,
  );
  const update = await request(
    "profile",
    { name: "First", username: "new_handle" },
    first.cookie,
  );
  assert.equal(update.status, 200, await update.clone().text());
  assert.equal((await update.json()).username, "new_handle");
  assert.equal(
    fixture.records.get("user:" + second.id).data.username,
    second.username,
  );
});

async function media(user: any, privateFile: boolean) {
  const response = await request(
    "upload",
    {
      name: privateFile ? "artwork.zip" : "preview.png",
      type: privateFile ? "application/zip" : "image/png",
      base64: privateFile ? "UEsDBA==" : "iVBORw0KGgo=",
      private: privateFile,
    },
    user.cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
test("sale posts publish a linked priced download with its original file kept private", async () => {
  const seller = await account("post_seller");
  const preview = await media(seller, false),
    file = await media(seller, true);
  const response = await request(
    "post",
    {
      caption: "My digital artwork #art",
      media: [preview.url],
      sale: { price: "25.50", fileId: file.id },
    },
    seller.cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  const post = await response.json();
  const product = fixture.records.get("product:" + post.productId).data;
  assert.equal(product.price, 25.5);
  assert.equal(product.userId, seller.id);
  assert.equal(product.fileId, file.id);
  assert.equal(product.status, "published");
  const publicState = await (await state()).json();
  assert.ok(
    publicState.posts.some(
      (p: any) => p.id === post.id && p.productId === product.id,
    ),
  );
  assert.equal(
    publicState.products.find((p: any) => p.id === product.id).fileId,
    undefined,
  );
  const edited = await request(
    "post",
    { id: post.id, caption: "Updated caption", media: [preview.url] },
    seller.cookie,
  );
  assert.equal((await edited.json()).productId, product.id);
  const normal = await request(
    "post",
    { caption: "A regular post", media: [] },
    seller.cookie,
  );
  assert.equal((await normal.json()).productId, undefined);
});

test("sale posts reject invalid prices, missing previews and someone else's private file", async () => {
  const seller = await account("sale_owner"),
    stranger = await account("sale_other");
  const preview = await media(seller, false),
    file = await media(seller, true),
    otherFile = await media(stranger, true);
  const body = {
    caption: "A priced post",
    media: [preview.url],
    sale: { price: 10, fileId: file.id },
  };
  for (const price of [-1, 0.5, 10001, "invalid", 1.999])
    assert.equal(
      (
        await request(
          "post",
          { ...body, sale: { ...body.sale, price } },
          seller.cookie,
        )
      ).status,
      400,
    );
  assert.equal(
    (await request("post", { ...body, media: [] }, seller.cookie)).status,
    400,
  );
  assert.equal(
    (
      await request(
        "post",
        { ...body, sale: { price: 10, fileId: otherFile.id } },
        seller.cookie,
      )
    ).status,
    400,
  );
  const freePost = await request(
    "post",
    { ...body, sale: { ...body.sale, price: 0, category: "Plugins" } },
    seller.cookie,
  );
  assert.equal(freePost.status, 200);
  const freeData = await freePost.json();
  assert.equal(
    fixture.records.get("product:" + freeData.productId).data.category,
    "Plugins",
  );
  assert.equal(
    fixture.records.get("product:" + freeData.productId).data.price,
    0,
  );
  const before = fixture.records.size;
  fixture.setFailBulk(true);
  const failed = await request("post", body, seller.cookie);
  assert.equal(failed.status, 503);
  assert.equal(fixture.records.size, before);
  fixture.setFailBulk(false);
});

test("activity persists for returning users, stays private, and is read independently of chats", async () => {
  const creator = await account("activity_creator");
  const actor = await account("activity_actor");
  const postResponse = await request(
    "post",
    { caption: "Activity test", media: [] },
    creator.cookie,
  );
  const post = await postResponse.json();
  assert.equal(postResponse.status, 200);
  assert.equal(
    (await request("follow", { target: creator.id }, actor.cookie)).status,
    200,
  );
  assert.equal(
    (await request("like", { target: post.id }, actor.cookie)).status,
    200,
  );
  assert.equal(
    (
      await request(
        "comment",
        { target: post.id, text: "Lovely work" },
        actor.cookie,
      )
    ).status,
    200,
  );
  let items = (await (await state(creator.cookie)).json()).notifications;
  assert.equal(items.length, 3);
  assert.ok(
    items.every(
      (n: any) => !n.read && n.userId === creator.id && n.actorId === actor.id,
    ),
  );
  assert.ok(items.some((n: any) => n.target === "profile:" + actor.id));
  assert.ok(items.some((n: any) => n.target === "post:" + post.id));
  assert.deepEqual(
    (await (await state(actor.cookie)).json()).notifications,
    [],
  );
  assert.deepEqual((await (await state()).json()).notifications, []);
  // A chat read must never clear unrelated activity.
  await request("read", { from: actor.id }, creator.cookie);
  assert.equal(
    (await (await state(creator.cookie)).json()).notifications.filter(
      (n: any) => !n.read,
    ).length,
    3,
  );
  await request("notifications-read", { ids: [items[0].id] }, actor.cookie);
  assert.equal(
    (await (await state(creator.cookie)).json()).notifications.filter(
      (n: any) => !n.read,
    ).length,
    3,
  );
  assert.equal(
    (
      await request(
        "notifications-read",
        { ids: [items[0].id] },
        creator.cookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await (await state(creator.cookie)).json()).notifications.filter(
      (n: any) => !n.read,
    ).length,
    2,
  );
  // A new event after a displayed snapshot must survive marking that snapshot.
  await request(
    "comment",
    { target: post.id, text: "Another interaction" },
    actor.cookie,
  );
  await request(
    "notifications-read",
    { ids: items.map((n: any) => n.id) },
    creator.cookie,
  );
  items = (await (await state(creator.cookie)).json()).notifications;
  assert.equal(items.filter((n: any) => !n.read).length, 1);
  assert.ok(
    items.every(
      (n: any, i: number) => i === 0 || items[i - 1].createdAt >= n.createdAt,
    ),
  );
  assert.notEqual(
    (await request("notifications-read", { ids: [] })).status,
    200,
  );
  assert.notEqual(
    (await request("notifications-read", { ids: "all" }, creator.cookie))
      .status,
    200,
  );
  await request("like", { target: post.id }, creator.cookie);
  assert.equal(
    (await (await state(creator.cookie)).json()).notifications.length,
    4,
    "self-interactions do not notify the owner",
  );
});

test("message state is chronological and restricted to the signed-in participants", async () => {
  const sender = await account("chat_order_sender");
  const receiver = await account("chat_order_receiver");
  const outsider = await account("chat_order_outsider");
  for (const [id, createdAt] of [
    ["order_z", 100],
    ["order_a", 300],
    ["order_m", 200],
  ] as const) {
    fixture.records.set("message:" + id, {
      kind: "message",
      id,
      data: {
        id,
        from: sender.id,
        to: receiver.id,
        text: id,
        read: false,
        createdAt,
      },
    });
  }
  for (const user of [sender, receiver]) {
    const body = await (await state(user.cookie)).json();
    assert.deepEqual(
      body.messages.map((m: any) => m.id),
      ["order_z", "order_m", "order_a"],
    );
  }
  assert.deepEqual((await (await state(outsider.cookie)).json()).messages, []);
  assert.deepEqual((await (await state()).json()).messages, []);
});

test("creator portfolios share ordered pins publicly and reject another creator’s project", async () => {
  const creator = await account("portfolio_creator");
  const other = await account("portfolio_other");
  const first = "a".repeat(32);
  const second = "b".repeat(32);
  const foreign = "c".repeat(32);
  for (const [id, userId] of [
    [first, creator.id],
    [second, creator.id],
    [foreign, other.id],
  ]) {
    fixture.records.set("post:" + id, {
      kind: "post",
      id,
      data: { id, userId, title: id, createdAt: Date.now() },
    });
  }
  const portfolio = {
    name: creator.name,
    workHeadline: "Motion designer",
    availableForWork: true,
    pinnedPostIds: [second, first],
  };
  const saved = await request("profile", portfolio, creator.cookie);
  assert.equal(saved.status, 200, await saved.clone().text());
  const rejected = await request(
    "profile",
    { ...portfolio, pinnedPostIds: [foreign] },
    creator.cookie,
  );
  assert.equal(rejected.status, 403);
  const guest = await (await state()).json();
  const publicProfile = guest.users.find((user: any) => user.id === creator.id);
  assert.equal(publicProfile.workHeadline, "Motion designer");
  assert.equal(publicProfile.availableForWork, true);
  assert.deepEqual(publicProfile.pinnedPostIds, [second, first]);
  assert.equal(publicProfile.email, undefined);
});
