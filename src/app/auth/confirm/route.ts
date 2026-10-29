import { authClient, withAuth } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const url = new URL(req.url);
    const token_hash = url.searchParams.get("token_hash");
    if (!token_hash || url.searchParams.get("type") !== "email") {
      return new Response(
        "Invalid confirmation link. Return to the website and sign in or request a new email.",
        { status: 400 },
      );
    }
    const { error } = await authClient().auth.verifyOtp({
      token_hash,
      type: "email",
    });
    if (error)
      return new Response(
        "This confirmation link is invalid or expired. Please request a new one.",
        { status: 400 },
      );
    return Response.redirect(new URL("/", req.url), 303);
  });
}
