import sharp from "sharp";
import { get, session, withAuth } from "@/lib/server";
import { PRODUCT_BUCKET, signedMediaUrl } from "@/lib/media";

async function preview(id: string) {
  try {
    const file = await get("media", id);
    if (!file || file.private !== false || file.bucket === PRODUCT_BUCKET)
      return new Response("Not found", { status: 404 });

    const original = () =>
      new Response(null, {
        status: 307,
        headers: { Location: `/api/media/${id}`, "Cache-Control": "no-store" },
      });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return original();

    try {
      let bytes: Buffer;
      if (file.storagePath) {
        const source = await fetch(await signedMediaUrl(file), {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!source.ok) return original();
        bytes = Buffer.from(await source.arrayBuffer());
      } else {
        bytes = Buffer.from(file.base64, "base64");
      }

      const image = sharp(bytes, {
        animated: true,
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize({
          width: 768,
          height: 768,
          fit: "inside",
          withoutEnlargement: true,
        });
      const webp = await image.webp({ quality: 76 }).toBuffer();
      const keepOriginal = bytes.length <= webp.length;
      return new Response(new Uint8Array(keepOriginal ? bytes : webp), {
        headers: {
          "Content-Type": keepOriginal ? file.type : "image/webp",
          "Cache-Control": "public, max-age=600, s-maxage=86400",
          "Content-Security-Policy": "default-src 'none'",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Legacy or unsupported image encodings can still use the original route.
      return original();
    }
  } catch {
    return new Response("Media is unavailable.", { status: 503 });
  }
}

async function handleGET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await params;
  const f = await get("media", id);
  if (!f) return new Response("Not found", { status: 404 });
  if (f.private) {
    const u = await session(req);
    if (!u || (u.id !== f.userId && u.id !== f.recipientId))
      return new Response("Forbidden", { status: 403 });
    if (!f.recipientId)
      return new Response(
        "Use an authorised purchase link to download product files.",
        { status: 403 },
      );
  }
  if (f.storagePath) return Response.redirect(await signedMediaUrl(f), 307);
  return new Response(Buffer.from(f.base64, "base64"), {
    headers: {
      "Content-Type": f.type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": f.private
        ? "private, no-store"
        : "public, max-age=86400",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (new URL(req.url).search === "?preview=1") {
    const { id } = await context.params;
    if (!/^[a-f0-9]{32}$/.test(id))
      return new Response("Not found", { status: 404 });
    return preview(id);
  }
  return withAuth(req, () => handleGET(req, context));
}
