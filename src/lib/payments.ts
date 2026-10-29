import Stripe from "stripe";
import { get, put, all, uid, notify } from "./server";
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  if (!key.startsWith("sk_test_"))
    throw new Error("Only Stripe test-mode keys are enabled in this version.");
  return new Stripe(key);
}
export async function createCheckout(user: any, product: any) {
  const stripe = stripeClient();
  const accounts = JSON.parse(process.env.STRIPE_CONNECTED_ACCOUNTS || "{}");
  const destination = accounts[product.userId];
  if (!destination || !/^acct_[a-zA-Z0-9]+$/.test(destination))
    throw new Error("This seller has not completed Stripe Connect onboarding.");
  const account = await stripe.accounts.retrieve(destination);
  if (!account.charges_enabled || !account.payouts_enabled)
    throw new Error("This seller’s payment account is not yet ready.");
  let order = (await all("order")).find(
    (o) =>
      o.userId === user.id &&
      o.productId === product.id &&
      o.mode === "stripe-test" &&
      o.status === "pending",
  );
  if (!order)
    order = await put("order", {
      id: uid(),
      userId: user.id,
      productId: product.id,
      title: product.title,
      amount: product.price,
      status: "pending",
      mode: "stripe-test",
      createdAt: Date.now(),
    });
  const origin = process.env.APP_URL;
  if (!origin || !/^https?:\/\//.test(origin))
    throw new Error("Configure APP_URL for checkout.");
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(order.amount * 100),
            product_data: { name: order.title },
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: order.id },
      payment_intent_data: {
        transfer_data: { destination },
        metadata: { orderId: order.id },
      },
      success_url: `${origin}/?purchases=1`,
      cancel_url: `${origin}/?checkout=cancelled`,
    },
    { idempotencyKey: `checkout:${order.id}` },
  );
  await put("order", { ...order, stripeSessionId: checkout.id });
  return { url: checkout.url, orderId: order.id };
}
export async function processStripeEvent(event: Stripe.Event) {
  if (await get("stripe-event", event.id)) return;
  const s = event.data.object as Stripe.Checkout.Session;
  const order = s.metadata?.orderId
    ? await get("order", s.metadata.orderId)
    : null;
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  ) {
    if (
      !order ||
      order.mode !== "stripe-test" ||
      s.livemode ||
      s.id !== order.stripeSessionId ||
      s.client_reference_id !== order.id ||
      s.amount_total !== Math.round(order.amount * 100) ||
      s.currency !== "usd"
    )
      throw new Error("Checkout does not match its order.");
    if (s.payment_status === "paid" && order.status !== "paid") {
      await put("order", { ...order, status: "paid", paidAt: Date.now() });
      const p = await get("product", order.productId);
      await notify(
        order.userId,
        p.userId,
        "Your purchased download is ready",
        "downloads",
      );
      await notify(p.userId, order.userId, "purchased your resource", "seller");
    }
  } else if (
    [
      "checkout.session.expired",
      "checkout.session.async_payment_failed",
    ].includes(event.type) &&
    order &&
    order.status === "pending"
  ) {
    await put("order", {
      ...order,
      status: event.type.endsWith("expired") ? "expired" : "failed",
    });
  }
  await put("stripe-event", { id: event.id, processedAt: Date.now() });
}
