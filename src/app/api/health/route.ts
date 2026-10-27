import { all } from "@/lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    all("config");
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
