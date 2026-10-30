"use client";
import { useState, type FormEvent } from "react";
import {
  currencies,
  methodLabels,
  type PaymentMethod,
} from "@/lib/payment-methods";
type Props = {
  initial: PaymentMethod[];
  api: (name: string, body: any) => Promise<any>;
  onUpdated: () => Promise<void>;
};
const blank = (): PaymentMethod => ({
  id: crypto.randomUUID(),
  kind: "bank",
  currency: "USD",
  bankName: "",
  accountName: "",
  accountNumber: "",
  country: "",
  routing: "",
  email: "",
  url: "",
  instructions: "",
});
export default function SellerPaymentSettings({
  initial,
  api,
  onUpdated,
}: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initial);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  function update(index: number, field: keyof PaymentMethod, value: string) {
    setMessage("");
    setMethods((old) =>
      old.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api("seller-payment", { methods });
      setMethods(r.methods);
      await onUpdated();
      setMessage(
        "Payment details saved. Buyers will see methods matching your listing’s currency.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="account-settings"
      aria-labelledby="seller-payment-title"
    >
      <h3 id="seller-payment-title">Receive payments</h3>
      <p className="muted">
        Choose how buyers pay you directly. Your details appear in checkout, not
        on your public profile.
      </p>
      <form onSubmit={save}>
        <fieldset disabled={busy} className="payment-fields">
          {methods.map((m, index) => (
            <fieldset key={m.id} className="payment-method-editor">
              <legend>Payment option {index + 1}</legend>
              <div className="form-grid">
                <label>
                  Payment method
                  <select
                    value={m.kind}
                    onChange={(e) => update(index, "kind", e.target.value)}
                  >
                    {Object.entries(methodLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Currency you receive
                  <select
                    value={m.currency}
                    onChange={(e) => update(index, "currency", e.target.value)}
                  >
                    {currencies.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              {m.kind === "bank" ? (
                <>
                  <label>
                    Bank name
                    <input
                      required
                      maxLength={100}
                      value={m.bankName}
                      onChange={(e) =>
                        update(index, "bankName", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Account holder name
                    <input
                      required
                      maxLength={100}
                      value={m.accountName}
                      onChange={(e) =>
                        update(index, "accountName", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Account number / IBAN
                    <input
                      required
                      maxLength={80}
                      value={m.accountNumber}
                      onChange={(e) =>
                        update(index, "accountNumber", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Bank country
                    <input
                      required
                      maxLength={60}
                      value={m.country}
                      onChange={(e) => update(index, "country", e.target.value)}
                    />
                  </label>
                  <label>
                    Routing / SWIFT / sort code (optional)
                    <input
                      maxLength={100}
                      value={m.routing}
                      onChange={(e) => update(index, "routing", e.target.value)}
                    />
                  </label>
                </>
              ) : m.kind === "paypal" ? (
                <label>
                  PayPal email
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={m.email}
                    onChange={(e) => update(index, "email", e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  {methodLabels[m.kind]}
                  <input
                    type="url"
                    required
                    maxLength={500}
                    placeholder={
                      m.kind === "paystack"
                        ? "https://paystack.com/pay/…"
                        : "https://flutterwave.com/pay/…"
                    }
                    value={m.url}
                    onChange={(e) => update(index, "url", e.target.value)}
                  />
                </label>
              )}
              <label>
                Instructions (optional)
                <textarea
                  maxLength={500}
                  rows={2}
                  value={m.instructions}
                  onChange={(e) =>
                    update(index, "instructions", e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setMethods((old) => old.filter((_, i) => i !== index));
                  setMessage("");
                }}
              >
                Remove option {index + 1}
              </button>
            </fieldset>
          ))}
          {methods.length < 5 && (
            <button
              type="button"
              className="button secondary full"
              onClick={() => setMethods((old) => [...old, blank()])}
            >
              + Add payment option
            </button>
          )}
          <p className="fine-print">
            Add only accounts that can receive payments in the selected
            currency. Provider links require your own active account. Never
            enter passwords, card details or API keys here. Existing orders keep
            the instructions shown when they were placed.
          </p>
          <button className="button primary full">
            {busy ? "Saving…" : "Save payment details"}
          </button>
        </fieldset>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {message && (
          <p className="account-notice" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
