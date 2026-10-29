import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { POST, GET } from "../src/app/api/[...path]/route";
import { GET as media } from "../src/app/api/media/[id]/route";
import { uploadDirect } from "../src/lib/direct-upload";
const fixture = installSupabaseFixture();
after(() => fixture.restore());
const context = (path: string) => ({
  params: Promise.resolve({ path: [path] }),
});
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
async function account(name: string) {
  const result = await request("register", {
    name,
    username: name,
    email: name + "@example.com",
    password: "long-test-password",
  });
  assert.equal(result.status, 200, await result.clone().text());
  return {
    user: (await result.json()).user,
    cookie: result.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
function api(cookie: string, payloads: number[] = []) {
  return async (action: string, body: any) => {
    payloads.push(JSON.stringify(body).length);
    const response = await request(action, body, cookie);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  };
}
const jpeg = (size: number) => {
  const bytes = new Uint8Array(size);
  bytes.set([255, 216, 255]);
  return new File([bytes], "photo.jpg", { type: "image/jpeg" });
};

test("a 5 MB file goes directly to storage; only metadata reaches the API", async () => {
  const owner = await account("upload_owner");
  const payloads: number[] = [];
  const result = await uploadDirect(
    jpeg(5 * 1024 * 1024),
    false,
    api(owner.cookie, payloads),
  );
  assert.ok(payloads.every((size) => size < 1000));
  const stored = fixture.records.get("media:" + result.id).data;
  assert.equal(stored.size, 5 * 1024 * 1024);
  assert.equal(stored.base64, undefined);
  assert.equal(
    fixture.storageObjects.get(stored.storagePath)!.bytes.length,
    5 * 1024 * 1024,
  );
  assert.equal(fixture.records.has("media-upload:" + result.id), false);
  const publish = await request(
    "post",
    { caption: "Direct upload works", media: [result.url] },
    owner.cookie,
  );
  assert.equal(publish.status, 200, await publish.clone().text());
  const image = await media(new Request("https://app.test" + result.url), {
    params: Promise.resolve({ id: result.id }),
  });
  assert.equal(image.status, 307);
  assert.match(
    image.headers.get("location")!,
    /storage\/v1\/object\/sign\/voidstack-media/,
  );
  assert.equal(image.headers.get("Cache-Control"), "private, no-store");
  const retry = await request(
    "upload-complete",
    { id: result.id },
    owner.cookie,
  );
  assert.equal(retry.status, 200);
});

test("upload tickets require a session and enforce size, type, and ownership", async () => {
  const owner = await account("ticket_owner"),
    stranger = await account("ticket_stranger");
  const body = {
    name: "photo.jpg",
    type: "image/jpeg",
    size: 32,
    private: false,
  };
  assert.equal((await request("upload-init", body)).status, 400);
  assert.equal(
    (
      await request(
        "upload-init",
        { ...body, size: 11 * 1024 * 1024 },
        owner.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "upload-init",
        { ...body, type: "image/svg+xml" },
        owner.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "upload-init",
        { ...body, type: "application/pdf" },
        owner.cookie,
      )
    ).status,
    400,
  );
  const ticket = await (
    await request("upload-init", body, owner.cookie)
  ).json();
  assert.equal(
    (await request("upload-complete", { id: ticket.id }, stranger.cookie))
      .status,
    400,
  );
  fixture.storageObjects.set(ticket.path, {
    bytes: Buffer.from("a file pretending to be jpeg....."),
    type: "image/jpeg",
  });
  const invalid = await request(
    "upload-complete",
    { id: ticket.id },
    owner.cookie,
  );
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /does not match/);
  assert.equal(fixture.records.has("media:" + ticket.id), false);
  const wrongSize = await (
    await request("upload-init", body, owner.cookie)
  ).json();
  fixture.storageObjects.set(wrongSize.path, {
    bytes: Buffer.from([255, 216, 255]),
    type: "image/jpeg",
  });
  assert.equal(
    (await request("upload-complete", { id: wrongSize.id }, owner.cookie))
      .status,
    400,
  );
});

test("private attachments stay private and purchased files need the paid download route", async () => {
  const sender = await account("private_sender"),
    recipient = await account("private_receiver"),
    stranger = await account("private_stranger");
  const result = await uploadDirect(jpeg(100), true, api(sender.cookie));
  const read = (cookie = "") =>
    media(
      new Request("https://app.test" + result.url, { headers: { cookie } }),
      { params: Promise.resolve({ id: result.id }) },
    );
  assert.equal((await read()).status, 403);
  assert.equal((await read(sender.cookie)).status, 403); // Product files need a paid link until attached to a message.
  assert.equal(
    (
      await request(
        "message",
        { to: recipient.user.id, image: result.url },
        sender.cookie,
      )
    ).status,
    200,
  );
  assert.equal((await read(recipient.cookie)).status, 307);
  assert.equal((await read(sender.cookie)).status, 307);
  assert.equal((await read(stranger.cookie)).status, 403);
  const retry = await request(
    "upload-complete",
    { id: result.id },
    sender.cookie,
  );
  assert.equal(retry.status, 200);
  assert.equal(
    fixture.records.get("media:" + result.id).data.recipientId,
    recipient.user.id,
  );
});

test("missing storage setup gives a useful JSON error; oversized files are rejected before requests", async () => {
  const owner = await account("bucket_owner");
  fixture.setBucketExists(false);
  const response = await request(
    "upload-init",
    { name: "photo.jpg", type: "image/jpeg", size: 32 },
    owner.cookie,
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /bucket setup/);
  fixture.setBucketExists(true);
  let requests = 0;
  await assert.rejects(
    uploadDirect(jpeg(11 * 1024 * 1024), false, async () => {
      requests++;
    }),
    /10 MB/,
  );
  assert.equal(requests, 0);
});

test("paid product files redirect directly to storage after order and session checks", async () => {
  const seller = await account("file_seller"),
    buyer = await account("file_buyer"),
    stranger = await account("file_stranger");
  const bytes = new Uint8Array(5 * 1024 * 1024);
  bytes.set([80, 75, 3, 4]);
  const upload = await uploadDirect(
    new File([bytes], "project.zip", { type: "application/zip" }),
    true,
    api(seller.cookie),
  );
  const listing = await request(
    "product",
    {
      title: "Project file",
      description: "A test download",
      price: 10,
      fileId: upload.id,
      status: "published",
    },
    seller.cookie,
  );
  assert.equal(listing.status, 200, await listing.clone().text());
  const product = await listing.json();
  const checkout = await request(
    "checkout",
    { productId: product.id },
    buyer.cookie,
  );
  assert.equal(checkout.status, 200);
  const order = await checkout.json();
  const link = await (
    await request("download-link", { orderId: order.id }, buyer.cookie)
  ).json();
  const download = (cookie: string) =>
    GET(new Request("https://app.test" + link.url, { headers: { cookie } }), {
      params: Promise.resolve({ path: ["download", order.id] }),
    });
  const authorized = await download(buyer.cookie);
  assert.equal(authorized.status, 307);
  assert.match(authorized.headers.get("location")!, /download=project.zip/);
  assert.equal((await download(stranger.cookie)).status, 403);
});
