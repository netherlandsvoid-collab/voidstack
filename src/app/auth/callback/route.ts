import { authClient, withAuth } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return withAuth(req, async () => {
    const query = new URL(req.url).searchParams;
    const code = query.get("code");
    const flowId = query.get("sb_flow_id");
    if (!code || code.length > 2048)
      return new Response(
        "This email link is incomplete. Finish the confirmation links in both inboxes, then return to the site and sign in.",
        { status: 400 },
      );
    const { error } = await authClient().auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error)
      return new Response(
        "This link has expired or was opened in a different browser. Complete the email confirmation and return to the site to sign in.",
        { status: 400 },
      );
    return Response.redirect(
      new URL("/?account=email-confirmed", req.url),
      303,
    );
  });
}
