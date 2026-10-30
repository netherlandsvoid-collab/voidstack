"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  money,
  methodLabels,
  orderStatus,
  type PaymentMethod,
} from "@/lib/payment-methods";
import PaymentDetails from "./PaymentDetails";
type Props = {
  product: any;
  existingOrder?: any;
  api: (name: string, body: any) => Promise<any>;
  onUpdated: () => Promise<void>;
  onOrders: () => void;
};
export default function DirectCheckout({
  product,
  existingOrder,
  api,
  onUpdated,
  onOrders,
}: Props) {
  const [order, setOrder] = useState<any>(existingOrder);
  const statusHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (order?.status) statusHeading.current?.focus({ preventScroll: true });
  }, [order?.status]);
  const [options, setOptions] = useState<any>(null);
  const [methodId, setMethodId] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (existingOrder) {
      setStarted(true);
      return;
    }
    let active = true;
    api("checkout-options", { productId: product.id })
      .then((r) => {
        if (active) {
          setOptions(r);
          setMethodId(r.methods[0]?.id || "");
          setStarted(true);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setStarted(true);
        }
      });
    return () => {
      active = false;
    };
    // A checkout belongs to one product; parent keys this component by identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  async function run(name: string, body: any) {
    setBusy(true);
    setError("");
    try {
      const r = await api(name, body);
      setOrder(r);
      await onUpdated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function sent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    void run("direct-order", {
      orderId: order.id,
      revision: order.revision,
      action: "sent",
      reference: data.reference,
      payerName: data.payerName,
    });
  }
  useEffect(() => {
    if (existingOrder) setOrder(existingOrder);
  }, [existingOrder]);
  const method = options?.methods.find((m: PaymentMethod) => m.id === methodId);
  return (
    <div className="direct-checkout">
      <div className="eyebrow">DIRECT TO THE CREATOR</div>
      <h2 ref={statusHeading} tabIndex={-1}>
        {order?.status === "paid"
          ? "Your download is ready."
          : "Pay the seller directly."}
      </h2>
      <div className="checkout-item">
        <strong>
          {order?.title || options?.product.title || product.title}
        </strong>
        <b>
          {money(
            order?.amount ?? options?.product.price ?? product.price,
            order?.currency ||
              options?.product.currency ||
              product.currency ||
              "USD",
          )}
        </b>
      </div>
      {!order ? (
        <>
          {!started && <p role="status">Loading payment options…</p>}
          {options && !options.methods.length && (
            <p className="account-notice">
              This seller hasn’t added a payment option for{" "}
              {options.product.currency}. Please contact them before paying. No
              order has been placed.
            </p>
          )}
          {!!options?.methods.length && (
            <>
              <label>
                How would you like to pay?
                <select
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                  disabled={busy}
                >
                  {options.methods.map((m: PaymentMethod, i: number) => (
                    <option key={m.id} value={m.id}>
                      {methodLabels[m.kind]} · {m.currency} · Option {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <p className="fine-print">
                Reserve your order first to see the seller’s payment
                instructions. The amount and instructions are saved with your
                order.
              </p>
              <button
                className="button primary full"
                disabled={busy || !method}
                onClick={() =>
                  run("checkout", { productId: product.id, methodId })
                }
              >
                {busy ? "Preparing…" : "Show payment instructions"}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <p className="account-notice" role="status">
            {orderStatus(order.status)}
          </p>
          <p className="fine-print">
            Order reference: <b className="order-reference">{order.id}</b>
          </p>
          {order.status !== "paid" && (
            <PaymentDetails method={order.paymentMethod} />
          )}
          {order.sellerNote && order.status !== "paid" && (
            <p className="error-box">Seller’s note: {order.sellerNote}</p>
          )}
          {["awaiting_payment", "payment_not_received"].includes(
            order.status,
          ) && (
            <form onSubmit={sent}>
              <p>
                Send exactly <b>{money(order.amount, order.currency)}</b> using
                these details. Include your order reference if your payment
                service allows it.
              </p>
              <label>
                Name on your payment
                <input name="payerName" required maxLength={100} />
              </label>
              <label>
                Transaction reference / payment ID
                <input name="reference" required maxLength={160} />
              </label>
              <button className="button primary full" disabled={busy}>
                {busy ? "Sending…" : "I’ve sent payment"}
              </button>
            </form>
          )}
          {order.status === "awaiting_confirmation" && (
            <p>
              The seller will check their account. Your file unlocks after they
              confirm receipt. You can return to this order from Purchases &
              downloads.
            </p>
          )}
          <button className="button secondary full" onClick={onOrders}>
            {order.status === "paid"
              ? "Go to your downloads"
              : "View all your orders"}
          </button>
        </>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <p className="fine-print">
        Payment goes to the seller outside Nexirel. Nexirel does not process,
        hold or automatically verify these payments. Refunds must be arranged
        with the seller.
      </p>
    </div>
  );
}
