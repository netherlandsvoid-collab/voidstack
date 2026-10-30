export const currencies = [
  "USD",
  "NGN",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "GHS",
  "KES",
  "ZAR",
] as const;
export type PaymentMethod = {
  id: string;
  kind: "bank" | "paypal" | "paystack" | "flutterwave";
  currency: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  country: string;
  routing: string;
  email: string;
  url: string;
  instructions: string;
};
export const methodLabels = {
  bank: "Bank transfer",
  paypal: "PayPal",
  paystack: "Paystack payment link",
  flutterwave: "Flutterwave payment link",
};
export function money(amount: number, currency = "USD") {
  return `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function orderStatus(status: string) {
  return (
    (
      {
        awaiting_payment: "Awaiting your payment",
        awaiting_confirmation: "Waiting for seller confirmation",
        payment_not_received: "Seller could not find payment",
        paid: "Confirmed · Download ready",
      } as Record<string, string>
    )[status] || status
  );
}
