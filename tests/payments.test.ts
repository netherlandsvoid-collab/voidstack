import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Stripe from "stripe";
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "nexirel-payment-test-"));
const { put, get, all } = await import("../src/lib/server");
const { processStripeEvent } = await import("../src/lib/payments");
const stripe = new Stripe("sk_test_local_signature_verification_only");
test("Stripe verifies the exact raw body and rejects tampering", () => {
  const payload = JSON.stringify({
      id: "evt_signature",
      type: "checkout.session.completed",
    }),
    secret = "whsec_local_unit_test";
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  assert.equal(
    stripe.webhooks.constructEvent(payload, signature, secret).id,
    "evt_signature",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", signature, secret),
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload, signature, "wrong_secret"),
  );
});
test("payment events verify amount/session and are idempotent", () => {
  put("product", { id: "test_product", userId: "mila" });
  put("order", {
    id: "test_order",
    productId: "test_product",
    userId: "buyer",
    stripeSessionId: "cs_test_order",
    amount: 19,
    mode: "stripe-test",
    status: "pending",
  });
  const event = {
    id: "evt_order",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_order",
        metadata: { orderId: "test_order" },
        client_reference_id: "test_order",
        currency: "usd",
        amount_total: 1900,
        payment_status: "paid",
        livemode: false,
      },
    },
  } as unknown as Stripe.Event;
  const bad = structuredClone(event) as any;
  bad.data.object.amount_total = 1;
  assert.throws(() => processStripeEvent(bad), /does not match/);
  assert.equal(get("order", "test_order").status, "pending");
  assert.equal(get("stripe-event", "evt_order"), undefined);
  processStripeEvent(event);
  assert.equal(get("order", "test_order").status, "paid");
  const count = all("notification").length;
  processStripeEvent(event);
  assert.equal(all("notification").length, count);
  const live = structuredClone(event) as any;
  live.id = "evt_live";
  live.data.object.livemode = true;
  assert.throws(() => processStripeEvent(live), /does not match/);
});
