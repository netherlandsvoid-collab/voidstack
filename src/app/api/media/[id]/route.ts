import { get, session } from "@/lib/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const f = get("media", id);
  if (!f) return new Response("Not found", { status: 404 });
  if (f.private) {
    const u = session(req);
    if (!u || (u.id !== f.userId && u.id !== f.recipientId))
      return new Response("Forbidden", { status: 403 });
    if (!f.recipientId)
      return new Response(
        "Use an authorised purchase link to download product files.",
        { status: 403 },
      );
  }
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
