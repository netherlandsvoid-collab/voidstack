import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { POST, GET } from "../src/app/api/[...path]/route";
import { put, get } from "../src/lib/server";
import { validateMethods } from "../src/lib/direct-payments";
const fixture = installSupabaseFixture();
after(() => fixture.restore());
const context = (path: string) => ({
  params: Promise.resolve({ path: [path] }),
});
async function request(path: string, body: any, cookie = "") {
  const response = await POST(
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
  return { status: response.status, data: await response.json() };
}
async function account(name: string) {
  const response = await POST(
    new Request("https://app.test/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        username: name,
        email: name + "@example.com",
        password: "direct-payment-test-123",
      }),
    }),
    context("register"),
  );
  assert.equal(response.status, 200);
  return {
    ...(await response.json()).user,
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
async function state(cookie = "") {
  return (
    await GET(
      new Request("https://app.test/api/state", { headers: { cookie } }),
      context("state"),
    )
  ).json();
}
const bank = {
  kind: "bank",
  currency: "NGN",
  bankName: "Fixture Bank",
  accountName: "Test Artist",
  accountNumber: "0000000123",
  country: "Nigeria",
};
async function setup(suffix: string) {
  const seller = await account("seller_" + suffix),
    buyer = await account("buyer_" + suffix),
    stranger = await account("other_" + suffix);
  await put("media", {
    id: "file_" + suffix,
    userId: seller.id,
    private: true,
    name: "scene.zip",
    base64: Buffer.from("original file").toString("base64"),
  });
  const product = (
    await request(
      "product",
      {
        title: "Scene " + suffix,
        description: "A private project file",
        price: 15000,
        currency: "NGN",
        fileId: "file_" + suffix,
        status: "published",
      },
      seller.cookie,
    )
  ).data;
  assert.ok(product.id);
  const methods = (
    await request(
      "seller-payment",
      {
        methods: [
          bank,
          { kind: "paypal", currency: "USD", email: "fixture@example.com" },
        ],
      },
      seller.cookie,
    )
  ).data.methods;
  return { seller, buyer, stranger, product, methods };
}
test("payment settings reject unsafe links and malformed methods", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://paystack.com.evil.test/pay/x",
    "https://paystack.com@evil.test/pay/x",
    "http://paystack.com/pay/x",
    "https://evil.test",
  ])
    assert.throws(() =>
      validateMethods([{ kind: "paystack", currency: "NGN", url }]),
    );
  assert.throws(() =>
    validateMethods([{ kind: "paypal", currency: "USD", email: "broken" }]),
  );
  assert.throws(() => validateMethods([{ ...bank, currency: "BAD" }]));
  assert.throws(() => validateMethods(Array(6).fill(bank)));
  assert.equal(
    validateMethods([
      {
        kind: "paystack",
        currency: "NGN",
        url: "https://paystack.com/pay/demo",
      },
    ])[0].url,
    "https://paystack.com/pay/demo",
  );
});
test("private settings and order data stay scoped; currency matching and immutable snapshots", async () => {
  const { seller, buyer, stranger, product, methods } = await setup("privacy");
  assert.equal(
    (await request("seller-payment", { methods: [bank] })).status,
    400,
  );
  for (const cookie of ["", buyer.cookie, stranger.cookie]) {
    const data = await state(cookie);
    assert.deepEqual(data.sellerPaymentMethods, []);
    assert.ok(!JSON.stringify(data).includes("0000000123"));
  }
  assert.equal((await state(seller.cookie)).sellerPaymentMethods.length, 2);
  const options = await request(
    "checkout-options",
    { productId: product.id },
    buyer.cookie,
  );
  assert.equal(options.data.methods.length, 1);
  assert.equal(options.data.product.currency, "NGN");
  assert.equal(
    (
      await request(
        "checkout",
        { productId: product.id, methodId: methods[1].id },
        buyer.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "checkout",
        { productId: product.id, methodId: methods[0].id },
        seller.cookie,
      )
    ).status,
    400,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 4 }, () =>
      request(
        "checkout",
        {
          productId: product.id,
          methodId: methods[0].id,
          amount: 1,
          currency: "USD",
          status: "paid",
        },
        buyer.cookie,
      ),
    ),
  );
  assert.ok(concurrent.every((r) => r.status === 200));
  const order = concurrent[0].data;
  assert.ok(concurrent.every((r) => r.data.id === order.id));
  assert.equal(order.amount, 15000);
  assert.equal(order.currency, "NGN");
  assert.equal(order.fileId, undefined);
  await request("seller-payment", { methods: [] }, seller.cookie);
  await request("product", { ...product, price: 25000 }, seller.cookie);
  assert.equal(
    (await request("checkout", { productId: product.id }, buyer.cookie)).data
      .amount,
    15000,
  );
  assert.equal((await state(stranger.cookie)).orders.length, 0);
  assert.equal((await state(stranger.cookie)).sellerOrders.length, 0);
  const own = (await state(buyer.cookie)).orders.find(
    (o: any) => o.id === order.id,
  );
  assert.equal(own.paymentMethod.accountNumber, bank.accountNumber);
  assert.equal(own.fileId, undefined);
});
test("only the seller can unlock a file; rejection, resubmission, stale reviews and retries", async () => {
  const { seller, buyer, stranger, product, methods } = await setup("flow");
  let order = (
    await request(
      "checkout",
      { productId: product.id, methodId: methods[0].id },
      buyer.cookie,
    )
  ).data;
  const update = (who: any, extra: any) =>
    request(
      "direct-order",
      { orderId: order.id, revision: order.revision, ...extra },
      who.cookie,
    );
  assert.equal(
    (await request("download-link", { orderId: order.id }, buyer.cookie))
      .status,
    403,
  );
  assert.equal(
    (await update(seller, { action: "confirm", received: true })).status,
    400,
  );
  assert.equal(
    (
      await update(stranger, {
        action: "sent",
        reference: "fake",
        payerName: "Fake",
      })
    ).status,
    400,
  );
  assert.equal(
    (await update(buyer, { action: "sent", reference: "", payerName: "Buyer" }))
      .status,
    400,
  );
  order = (
    await update(buyer, {
      action: "sent",
      reference: "ref-123",
      payerName: "Buyer",
    })
  ).data;
  assert.equal(order.status, "awaiting_confirmation");
  assert.equal(
    (await request("download-link", { orderId: order.id }, buyer.cookie))
      .status,
    403,
  );
  assert.equal(
    (await update(buyer, { action: "confirm", received: true })).status,
    400,
  );
  assert.equal(
    (await update(stranger, { action: "confirm", received: true })).status,
    400,
  );
  assert.equal((await update(seller, { action: "confirm" })).status, 400);
  const oldRevision = order.revision;
  order = (
    await update(seller, {
      action: "reject",
      note: "Please check the payment reference.",
    })
  ).data;
  assert.equal(order.status, "payment_not_received");
  order = (
    await update(buyer, {
      action: "sent",
      reference: "corrected-456",
      payerName: "Buyer",
    })
  ).data;
  assert.equal(
    (
      await update(seller, {
        action: "confirm",
        received: true,
        revision: oldRevision,
      })
    ).status,
    400,
  );
  const confirmed = await Promise.all([
    update(seller, { action: "confirm", received: true }),
    update(seller, { action: "reject", note: "stale competing review" }),
  ]);
  assert.equal(confirmed.filter((r) => r.status === 200).length, 1);
  order = await get("order", order.id);
  if (order.status !== "paid") {
    order = (
      await update(buyer, {
        action: "sent",
        reference: "corrected-456",
        payerName: "Buyer",
      })
    ).data;
    order = (await update(seller, { action: "confirm", received: true })).data;
  }
  assert.equal(order.status, "paid");
  assert.equal(
    (
      await update(buyer, {
        action: "sent",
        reference: "retry",
        payerName: "Buyer",
      })
    ).data.status,
    "paid",
  );
  assert.equal(
    (await update(seller, { action: "reject", note: "No" })).status,
    400,
  );
  assert.equal(
    (await request("download-link", { orderId: order.id }, stranger.cookie))
      .status,
    403,
  );
  // Listing edits after checkout must not replace the file the buyer paid for.
  await put("media", {
    id: "replacement",
    userId: seller.id,
    private: true,
    name: "replacement.zip",
    base64: Buffer.from("replacement").toString("base64"),
  });
  await request(
    "product",
    { ...product, fileId: "replacement", status: "archived" },
    seller.cookie,
  );
  const link = (
    await request("download-link", { orderId: order.id }, buyer.cookie)
  ).data.url;
  const downloaded = await GET(
    new Request("https://app.test" + link, {
      headers: { cookie: buyer.cookie },
    }),
    { params: Promise.resolve({ path: ["download", order.id] }) },
  );
  assert.equal(downloaded.status, 200);
  assert.equal(await downloaded.text(), "original file");
});
