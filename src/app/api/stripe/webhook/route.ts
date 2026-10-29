import { stripeClient, processStripeEvent } from "@/lib/payments";
export const runtime = "nodejs";
export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature)
      return Response.json({ error: "Missing signature" }, { status: 400 });
    const event = stripeClient().webhooks.constructEvent(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    await processStripeEvent(event);
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Invalid or mismatched payment event" },
      { status: 400 },
    );
  }
}
