import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:3000";
async function request(path: string, body?: unknown, cookie = "") {
  const r = await fetch(base + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any;
  try {
    data = await r.clone().json();
  } catch {
    data = await r.text();
  }
  return { r, data, cookie: r.headers.get("set-cookie")?.split(";")[0] || "" };
}
test("connected creative journeys and server access controls", async (t) => {
  const suffix = Date.now(),
    password = "long-test-password";
  let a: any,
    b: any,
    c: any,
    post: any,
    product: any,
    order: any,
    privateFile: any;
  await t.test(
    "register accounts, persist sessions, and reject bad credentials",
    async () => {
      a = await request("register", {
        name: "Test Seller",
        username: "seller_" + suffix,
        email: `seller${suffix}@example.com`,
        password,
      });
      b = await request("register", {
        name: "Test Buyer",
        username: "buyer_" + suffix,
        email: `buyer${suffix}@example.com`,
        password,
      });
      c = await request("register", {
        name: "Test Stranger",
        username: "other_" + suffix,
        email: `other${suffix}@example.com`,
        password,
      });
      assert.equal(a.r.status, 200);
      assert.ok(a.cookie);
      assert.equal(
        (
          await request("login", {
            email: `seller${suffix}@example.com`,
            password: "wrong",
          })
        ).r.status,
        400,
      );
      assert.equal(
        (await request("state", undefined, a.cookie)).data.me.name,
        "Test Seller",
      );
    },
  );
  await t.test(
    "complete profile, publish and comment on a post; enforce ownership",
    async () => {
      assert.equal(
        (
          await request(
            "profile",
            {
              name: "Test Seller",
              bio: "Independent illustrator",
              discipline: "Illustration",
            },
            a.cookie,
          )
        ).r.status,
        200,
      );
      post = (
        await request(
          "post",
          { caption: "My first artwork #illustration", media: [] },
          a.cookie,
        )
      ).data;
      assert.ok(post.id);
      assert.equal(
        (await request("post", { id: post.id, delete: true }, b.cookie)).r
          .status,
        403,
      );
      await request(
        "comment",
        { target: post.id, text: "Beautiful work!" },
        b.cookie,
      );
      const state = (await request("state", undefined, a.cookie)).data;
      assert.ok(state.posts.some((p: any) => p.id === post.id));
      assert.ok(state.comments.some((p: any) => p.target === post.id));
    },
  );
  await t.test("follow, message, and prevent third-party access", async () => {
    await request("follow", { target: a.data.user.id }, b.cookie);
    assert.ok(
      (await request("state", undefined, b.cookie)).data.follows.includes(
        a.data.user.id,
      ),
    );
    const m = await request(
      "message",
      { to: a.data.user.id, text: "Let’s collaborate." },
      b.cookie,
    );
    assert.equal(m.r.status, 200);
    assert.ok(
      (await request("state", undefined, a.cookie)).data.messages.some(
        (x: any) => x.id === m.data.id,
      ),
    );
    assert.ok(
      !(await request("state", undefined, c.cookie)).data.messages.some(
        (x: any) => x.id === m.data.id,
      ),
    );
    await request("block", { target: b.data.user.id }, a.cookie);
    assert.equal(
      (
        await request(
          "message",
          { to: a.data.user.id, text: "Blocked" },
          b.cookie,
        )
      ).r.status,
      403,
    );
  });
  await t.test(
    "publish a paid resource with private storage; do not leak file IDs",
    async () => {
      privateFile = (
        await request(
          "upload",
          {
            name: "artwork.pdf",
            type: "application/pdf",
            base64: Buffer.from("%PDF-1.4\nTest resource").toString("base64"),
            private: true,
          },
          a.cookie,
        )
      ).data;
      product = (
        await request(
          "product",
          {
            title: "Test illustration resource",
            description: "A real test file",
            price: 19,
            category: "Illustration",
            fileId: privateFile.id,
            status: "published",
          },
          a.cookie,
        )
      ).data;
      assert.ok(product.id);
      const publicState = (await request("state")).data;
      assert.equal(
        publicState.products.find((p: any) => p.id === product.id).fileId,
        undefined,
      );
      assert.equal(
        (await fetch(base + privateFile.url, { headers: { cookie: b.cookie } }))
          .status,
        403,
      );
    },
  );
  await t.test(
    "development checkout is idempotent; authorised signed downloads survive archiving",
    async () => {
      order = (await request("checkout", { productId: product.id }, b.cookie))
        .data;
      assert.equal(order.status, "paid");
      assert.equal(order.mode, "development");
      assert.equal(
        (await request("checkout", { productId: product.id }, b.cookie)).data
          .id,
        order.id,
      );
      const link = (
        await request("download-link", { orderId: order.id }, b.cookie)
      ).data.url;
      assert.equal(
        (await fetch(base + link, { headers: { cookie: c.cookie } })).status,
        403,
      );
      assert.equal(
        (await request("download-link", { orderId: order.id }, c.cookie)).r
          .status,
        403,
      );
      const downloaded = await fetch(base + link, {
        headers: { cookie: b.cookie },
      });
      assert.equal(downloaded.status, 200);
      assert.match(await downloaded.text(), /%PDF-1.4/);
      assert.equal(
        (
          await fetch(base + link.replace(/signature=.*/, "signature=wrong"), {
            headers: { cookie: b.cookie },
          })
        ).status,
        403,
      );
      await request("product", { ...product, status: "archived" }, a.cookie);
      assert.equal(
        (await fetch(base + link, { headers: { cookie: b.cookie } })).status,
        200,
      );
      assert.equal(
        (await request("admin", { kind: "user", id: a.data.user.id }, b.cookie))
          .r.status,
        403,
      );
    },
  );
});
