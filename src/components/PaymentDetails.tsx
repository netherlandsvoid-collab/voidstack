"use client";
import { methodLabels, type PaymentMethod } from "@/lib/payment-methods";
export default function PaymentDetails({ method }: { method: PaymentMethod }) {
  return (
    <div className="payment-details">
      <strong>
        {methodLabels[method.kind]} · {method.currency}
      </strong>
      {method.kind === "bank" ? (
        <dl>
          <dt>Bank</dt>
          <dd>{method.bankName}</dd>
          <dt>Account name</dt>
          <dd>{method.accountName}</dd>
          <dt>Account number / IBAN</dt>
          <dd>{method.accountNumber}</dd>
          <dt>Bank country</dt>
          <dd>{method.country}</dd>
          {method.routing && (
            <>
              <dt>Routing / SWIFT / sort code</dt>
              <dd>{method.routing}</dd>
            </>
          )}
        </dl>
      ) : method.kind === "paypal" ? (
        <p>
          PayPal email: <b>{method.email}</b>
        </p>
      ) : (
        <a
          className="button secondary"
          href={method.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open {methodLabels[method.kind]} ↗
        </a>
      )}
      {method.instructions && <p>{method.instructions}</p>}
    </div>
  );
}
