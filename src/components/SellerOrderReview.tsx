"use client";
import { useState, type FormEvent } from "react";
import { money, orderStatus } from "@/lib/payment-methods";
import PaymentDetails from "./PaymentDetails";
export default function SellerOrderReview({
  order,
  buyerName,
  api,
  onUpdated,
}: {
  order: any;
  buyerName: string;
  api: (name: string, body: any) => Promise<any>;
  onUpdated: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reviewMode, setReviewMode] = useState<"" | "confirm" | "reject">("");
  const confirming = reviewMode === "confirm";
  async function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("direct-order", {
        orderId: order.id,
        revision: order.revision,
        action: confirming ? "confirm" : "reject",
        received: data.get("received") === "on",
        note: data.get("note"),
      });
      setReviewMode("");
      await onUpdated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="seller-order-card">
      <div className="order-summary">
        <span>
          <strong>{order.title}</strong>
          <small>
            {buyerName} · {new Date(order.createdAt).toLocaleDateString()} ·{" "}
            {order.mode === "direct"
              ? "Direct payment"
              : `${order.mode} · No real payment`}
          </small>
        </span>
        <b>{money(order.amount, order.currency)}</b>
        <span className="status">{orderStatus(order.status)}</span>
      </div>
      {order.mode === "direct" && (
        <details>
          <summary>Payment details & review</summary>
          <p className="fine-print">
            Order reference: <span className="order-reference">{order.id}</span>
          </p>
          <PaymentDetails method={order.paymentMethod} />
          {order.paymentReference && (
            <p>
              Buyer’s payment ID: <b>{order.paymentReference}</b>
              <br />
              Payer: <b>{order.payerName}</b>
            </p>
          )}
          {order.sellerNote && <p>Your note: {order.sellerNote}</p>}
          {order.status === "awaiting_confirmation" && (
            <>
              <p>
                Check your bank or payment provider independently. A reference
                or screenshot alone does not confirm receipt.
              </p>
              <div className="review-actions">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => setReviewMode("confirm")}
                >
                  Payment received
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setReviewMode("reject")}
                >
                  Payment not found
                </button>
              </div>
              {reviewMode && (
                <form onSubmit={review}>
                  {confirming ? (
                    <label className="payment-confirm">
                      <input type="checkbox" name="received" required />I
                      checked my account and received the full{" "}
                      {money(order.amount, order.currency)}. Confirming unlocks
                      the buyer’s file.
                    </label>
                  ) : (
                    <label>
                      Message to buyer
                      <textarea
                        name="note"
                        required
                        maxLength={500}
                        placeholder="Explain what they should check before submitting again."
                      />
                    </label>
                  )}
                  <button className="button secondary full" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : confirming
                        ? "Confirm receipt & unlock download"
                        : "Send payment-not-found message"}
                  </button>
                </form>
              )}
            </>
          )}
        </details>
      )}
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
    </div>
  );
}
