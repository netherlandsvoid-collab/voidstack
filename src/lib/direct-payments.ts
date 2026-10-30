import { createHash } from "node:crypto";
import {
  all,
  get,
  put,
  database,
  BackendError,
  events,
  notify,
  uid,
  validateText,
} from "./server";
import { currencies, type PaymentMethod } from "./payment-methods";

const optional = (v: unknown, max: number) =>
  v === undefined || v === "" ? "" : validateText(v, max);
export function currencyCode(value: unknown = "USD") {
  if (
    typeof value !== "string" ||
    !(currencies as readonly string[]).includes(value)
  )
    throw new Error("Choose a supported currency.");
  return value;
}
export function listingPrice(value: unknown, currency: string) {
  const amount = Number(value),
    max = ["NGN", "KES"].includes(currency) ? 10000000 : 10000;
  if (
    !Number.isFinite(amount) ||
    amount < 1 ||
    amount > max ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
  )
    throw new Error(
      `Enter a ${currency} price between 1 and ${max} with at most two decimal places.`,
    );
  return amount;
}
export function validateMethods(input: unknown): PaymentMethod[] {
  if (!Array.isArray(input) || input.length > 5)
    throw new Error("Add up to five payment methods.");
  return input.map((m, index) => {
    const kind = m?.kind;
    if (!["bank", "paypal", "paystack", "flutterwave"].includes(kind))
      throw new Error("Choose a supported payment method.");
    const common = {
      id: `method-${index}-${uid()}`,
      kind,
      currency: currencyCode(m.currency),
      accountName: "",
      bankName: "",
      accountNumber: "",
      country: "",
      routing: "",
      email: "",
      url: "",
      instructions: optional(m.instructions, 500),
    };
    if (kind === "bank")
      return {
        ...common,
        accountName: validateText(m.accountName, 100),
        bankName: validateText(m.bankName, 100),
        accountNumber: validateText(m.accountNumber, 80),
        country: validateText(m.country, 60),
        routing: optional(m.routing, 100),
      };
    if (kind === "paypal") {
      const email = validateText(m.email, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid PayPal email.");
      return { ...common, email };
    }
    let url: URL;
    try {
      url = new URL(validateText(m.url, 500));
    } catch {
      throw new Error("Enter a valid HTTPS payment link.");
    }
    const hosts =
      kind === "paystack"
        ? ["paystack.com", "paystack.shop"]
        : ["flutterwave.com"];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !hosts.includes(url.hostname)
    )
      throw new Error(
        `Use a payment link on ${hosts.join(" or ")} over HTTPS.`,
      );
    return { ...common, url: url.href };
  });
}
export async function savePaymentMethods(user: any, body: any) {
  const methods = validateMethods(body.methods);
  await put("seller-payment", { id: user.id, methods, updatedAt: Date.now() });
  return { methods };
}
async function availableProduct(user: any, productId: string) {
  const product = await get("product", productId);
  if (!product || product.status !== "published" || product.seed)
    throw new Error("This resource is unavailable for direct purchase.");
  if (product.userId === user.id)
    throw new Error("You cannot purchase your own product.");
  const seller = await get("user", product.userId);
  if (!seller || seller.disabled)
    throw new Error("This seller is unavailable.");
  const file = product.fileId ? await get("media", product.fileId) : null;
  if (!file || !file.private || file.userId !== seller.id)
    throw new Error("This listing has no available download.");
  return product;
}
export async function checkoutOptions(user: any, body: any) {
  const product = await availableProduct(user, body.productId);
  const config = await get("seller-payment", product.userId);
  const currency = currencyCode(product.currency || "USD");
  return {
    product: {
      id: product.id,
      title: product.title,
      price: product.price,
      currency,
    },
    methods: (config?.methods || []).filter(
      (m: PaymentMethod) => m.currency === currency,
    ),
  };
}
export function publicOrder(order: any) {
  const { fileId, ...safe } = order;
  return safe;
}
async function alert(
  userId: string,
  actorId: string,
  text: string,
  target: string,
) {
  try {
    await notify(userId, actorId, text, target);
  } catch {
    console.error("Direct payment notification could not be saved.");
  }
}
export async function startDirectOrder(user: any, body: any) {
  const product = await availableProduct(user, body.productId);
  const existing = (await all("order")).find(
    (o) =>
      o.userId === user.id &&
      o.productId === product.id &&
      (o.status === "paid" || o.mode === "direct"),
  );
  if (existing) return publicOrder(existing);
  const config = await get("seller-payment", product.userId);
  const method = (config?.methods || []).find(
    (m: PaymentMethod) =>
      m.id === body.methodId && m.currency === (product.currency || "USD"),
  );
  if (!method)
    throw new Error(
      "Select an available payment method in the listing’s currency.",
    );
  const order = {
    id: createHash("sha256")
      .update(`direct:${user.id}:${product.id}`)
      .digest("hex"),
    userId: user.id,
    sellerId: product.userId,
    productId: product.id,
    fileId: product.fileId,
    title: product.title,
    amount: product.price,
    currency: product.currency || "USD",
    paymentMethod: method,
    revision: uid(),
    status: "awaiting_payment",
    mode: "direct",
    createdAt: Date.now(),
  };
  // Unique primary key + DO NOTHING prevents simultaneous clicks from creating
  // duplicates or overwriting a paid order with an old checkout request.
  const { error } = await database()
    .from("voidstack_records")
    .upsert(
      { kind: "order", id: order.id, data: order },
      { onConflict: "kind,id", ignoreDuplicates: true },
    );
  if (error) throw new BackendError("Could not create your order. Try again.");
  events.emit("change");
  return publicOrder(await get("order", order.id));
}
export async function updateDirectOrder(user: any, body: any) {
  const order = await get("order", validateText(body.orderId, 200));
  if (!order || order.mode !== "direct")
    throw new Error("Direct payment order not found.");
  const buyer = user.id === order.userId,
    seller = user.id === order.sellerId;
  if (body.action === "sent" ? !buyer : !seller)
    throw new Error("You do not have access to this order action.");
  if (order.status !== "paid" && body.revision !== order.revision)
    throw new Error(
      "This order changed. Refresh and review its current status.",
    );
  let next: any;
  if (body.action === "sent") {
    if (order.status === "awaiting_confirmation" || order.status === "paid")
      return publicOrder(order);
    if (!["awaiting_payment", "payment_not_received"].includes(order.status))
      throw new Error("This order cannot be updated.");
    next = {
      ...order,
      status: "awaiting_confirmation",
      paymentReference: validateText(body.reference, 160),
      payerName: validateText(body.payerName, 100),
      submittedAt: Date.now(),
    };
  } else if (["confirm", "reject"].includes(body.action)) {
    if (order.status === "paid" && body.action === "confirm")
      return publicOrder(order);
    if (order.status !== "awaiting_confirmation")
      throw new Error("The buyer has not submitted a payment for review.");
    if (body.action === "confirm") {
      if (body.received !== true)
        throw new Error(
          "Check your account and confirm that you received the full payment.",
        );
      next = {
        ...order,
        status: "paid",
        paidAt: Date.now(),
        confirmedBy: user.id,
      };
    } else
      next = {
        ...order,
        status: "payment_not_received",
        sellerNote: validateText(body.note, 500),
        reviewedAt: Date.now(),
      };
  } else throw new Error("Invalid order action.");
  // Compare-and-swap: a stale buyer retry or second seller tab cannot reverse
  // payment confirmation or approve a different submitted payment revision.
  next.revision = uid();
  let query = database()
    .from("voidstack_records")
    .update({ data: next })
    .eq("kind", "order")
    .eq("id", order.id)
    .eq("data->>status", order.status);
  if (order.revision) query = query.eq("data->>revision", order.revision);
  const { data, error } = await query.select("data");
  if (error) throw new BackendError("Could not update the order. Try again.");
  if (!data?.length)
    throw new Error(
      "This order changed. Refresh and review its current status.",
    );
  events.emit("change");
  if (body.action === "sent")
    await alert(
      order.sellerId,
      user.id,
      "submitted a direct payment for review",
      "seller",
    );
  else
    await alert(
      order.userId,
      user.id,
      body.action === "confirm"
        ? "confirmed your payment. Your download is ready"
        : "could not find your payment. Review your order",
      "downloads",
    );
  return publicOrder(next);
}
