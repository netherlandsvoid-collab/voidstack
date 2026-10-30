import { test, after } from "node:test";
import assert from "node:assert/strict";
import { installSupabaseFixture } from "./supabase-fixture";
import { GET, POST } from "../src/app/api/[...path]/route";
import { GET as media } from "../src/app/api/media/[id]/route";
import { uploadResumable } from "../src/lib/resumable-upload";
import { tusFetchStack } from "./tus-fetch-stack";
const fixture = installSupabaseFixture();
after(() => fixture.restore());
async function req(path: string, body: any, cookie = "") {
  return POST(
    new Request("https://app.test/api/" + path, {
      method: "POST",
      headers: {
        host: "app.test",
        origin: "https://app.test",
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ path: [path] }) },
  );
}
async function owner(name: string) {
  const r = await req("register", {
    username: name,
    name,
    email: name + "@example.com",
    password: "long test password",
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
}
const ticketBody = (size: number) => ({
  name: "scene.blend",
  type: "application/octet-stream",
  size,
  private: true,
  purpose: "product",
});
test("product limits are configurable through GB sizes while media remains 10 MB", async () => {
  const cookie = await owner("limits_owner");
  assert.equal(
    (await req("upload-init", ticketBody(100 * 1024 ** 2), cookie)).status,
    400,
  );
  const psd = await req(
    "upload-init",
    {
      ...ticketBody(32),
      name: "artwork.psd",
      type: "image/vnd.adobe.photoshop",
    },
    cookie,
  );
  assert.equal(
    psd.status,
    200,
    "native project MIME types are accepted privately",
  );
  const psdTicket = await psd.json();
  assert.equal(
    fixture.records.get("media-upload:" + psdTicket.id).data.type,
    "application/octet-stream",
  );
  process.env.PRODUCT_MAX_UPLOAD_MB = "5120";
  try {
    const r = await req("upload-init", ticketBody(1024 ** 3), cookie);
    assert.equal(r.status, 200, await r.clone().text());
    const ticket = await r.json();
    assert.equal(ticket.bucket, "voidstack-products");
    assert.equal(
      (await req("upload-init", ticketBody(5120 * 1024 ** 2 + 1), cookie))
        .status,
      400,
    );
    assert.equal(
      (
        await req(
          "upload-init",
          { ...ticketBody(100 * 1024 ** 2), purpose: undefined },
          cookie,
        )
      ).status,
      400,
    );
    assert.equal(
      (await req("upload-init", { ...ticketBody(100), private: false }, cookie))
        .status,
      400,
    );
    const r2 = await GET(new Request("https://app.test/api/state"), {
      params: Promise.resolve({ path: ["state"] }),
    });
    assert.equal((await r2.json()).uploadLimits.product, 5120 * 1024 ** 2);
  } finally {
    delete process.env.PRODUCT_MAX_UPLOAD_MB;
  }
});
test("real TUS client sends 6 MB chunks, resumes a failed chunk, then verifies a private product file", async () => {
  const cookie = await owner("tus_owner");
  const stranger = await owner("tus_stranger");
  const bytes = new Uint8Array(7 * 1024 ** 2);
  bytes.set([80, 75, 3, 4]);
  const file = new File([bytes], "scene.zip", { type: "application/zip" });
  const r = await req(
    "upload-init",
    { ...ticketBody(file.size), name: file.name, type: file.type },
    cookie,
  );
  assert.equal(r.status, 200, await r.clone().text());
  const ticket = await r.json();
  fixture.setFailNextPatch();
  const progress: number[] = [];
  await uploadResumable(
    file,
    ticket,
    {
      url: "https://fixture.supabase.co",
      key: "sb_publishable_fixture",
      type: file.type,
    },
    { onProgress: (p) => progress.push(p) },
    { httpStack: tusFetchStack, retryDelays: [0, 0] },
  );
  assert.ok(
    fixture.tusRequests.some(
      (r) => r.method === "HEAD" && r.offset === 6 * 1024 ** 2,
    ),
    "retry discovers accepted offset",
  );
  assert.ok(fixture.tusRequests.every((r) => r.size <= 6 * 1024 ** 2));
  assert.ok(progress.length > 0);
  assert.equal(
    (await req("upload-complete", { id: ticket.id }, stranger)).status,
    400,
  );
  const completed = await req("upload-complete", { id: ticket.id }, cookie);
  assert.equal(completed.status, 200, await completed.clone().text());
  const result = await completed.json();
  assert.equal(result.name, "scene.zip");
  assert.equal(result.size, file.size);
  const stored = fixture.records.get("media:" + result.id).data;
  assert.equal(stored.bucket, "voidstack-products");
  assert.equal(stored.private, true);
  const read = await media(
    new Request("https://app.test" + result.url, { headers: { cookie } }),
    { params: Promise.resolve({ id: result.id }) },
  );
  assert.equal(
    read.status,
    403,
    "original cannot be fetched through public media route",
  );
  const listing = await req(
    "product",
    {
      title: "Scene original",
      description: "Project file",
      price: 12,
      fileId: result.id,
      status: "published",
    },
    cookie,
  );
  assert.equal(listing.status, 200);
  const state = async (c = "") =>
    (
      await GET(
        new Request("https://app.test/api/state", { headers: { cookie: c } }),
        { params: Promise.resolve({ path: ["state"] }) },
      )
    ).json();
  const mine = (await state(cookie)).products.find(
    (p: any) => p.title === "Scene original",
  );
  assert.deepEqual(mine.downloadFile, { name: "scene.zip", size: file.size });
  const publicItem = (await state()).products.find(
    (p: any) => p.title === "Scene original",
  );
  assert.equal(publicItem.fileId, undefined);
  assert.equal(publicItem.downloadFile, undefined);
});
