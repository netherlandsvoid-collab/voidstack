import { createCheckout } from "@/lib/payments";
import { NextResponse } from "next/server";
import {
  all,
  get,
  put,
  del,
  uid,
  hash,
  verify,
  publicUser,
  session,
  requireUser,
  notify,
  blocked,
  validateText,
  rate,
  sign,
} from "@/lib/server";
export const runtime = "nodejs";
const ok = (data: any) => NextResponse.json(data);
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const u = session(req),
      url = new URL(req.url);
    if (path[0] === "state") {
      const users = all("user").map(publicUser),
        blocks = u
          ? all("block")
              .filter((x) => x.userId === u.id)
              .map((x) => x.target)
          : [];
      return ok({
        mediaTypes: Object.fromEntries(
          all("media")
            .filter((m) => !m.private)
            .map((m) => ["/api/media/" + m.id, m.type]),
        ),
        me: publicUser(u),
        users,
        posts: all("post")
          .filter((x) => !blocks.includes(x.userId))
          .map((p) => ({
            ...p,
            likes:
              (p.likes || 0) +
              all("like").filter((l) => l.target === p.id && l.userId !== u?.id)
                .length,
          }))
          .sort((a, b) => b.createdAt - a.createdAt),
        products: all("product")
          .filter((x) => x.status === "published" || x.userId === u?.id)
          .map(({ fileId, ...p }) => p),
        follows: u
          ? all("follow")
              .filter((x) => x.userId === u.id)
              .map((x) => x.target)
          : [],
        likes: u
          ? all("like")
              .filter((x) => x.userId === u.id)
              .map((x) => x.target)
          : [],
        saved: u
          ? all("save")
              .filter((x) => x.userId === u.id)
              .map((x) => x.target)
          : [],
        comments: all("comment"),
        notifications: u
          ? all("notification").filter((x) => x.userId === u.id)
          : [],
        orders: u ? all("order").filter((x) => x.userId === u.id) : [],
        sellerOrders: u
          ? all("order").filter(
              (x) => get("product", x.productId)?.userId === u.id,
            )
          : [],
        messages: u
          ? all("message").filter((x) => x.from === u.id || x.to === u.id)
          : [],
        reports: u?.role === "admin" ? all("report") : [],
        adminUsers: u?.role === "admin" ? users : [],
        developmentCheckout: !process.env.STRIPE_SECRET_KEY,
      });
    }
    if (path[0] === "download") {
      const user = requireUser(req),
        order = get("order", path[1]);
      if (!order || order.userId !== user.id || order.status !== "paid")
        return okError("Purchase required", 403);
      const expires = Number(url.searchParams.get("expires")),
        sig = url.searchParams.get("signature");
      if (
        !expires ||
        expires < Date.now() ||
        sig !== sign(`${order.id}:${user.id}:${expires}`)
      )
        return okError("Download link expired. Request a new link.", 403);
      const p = get("product", order.productId),
        f = p?.fileId ? get("media", p.fileId) : null;
      if (f)
        return new Response(Buffer.from(f.base64, "base64"), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
            "Cache-Control": "private, no-store",
          },
        });
      return new Response(
        `Nexirel development sample\n${p.title}\nThis is a demonstration file, not a commercial asset.\nOrder: ${order.id}`,
        {
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": 'attachment; filename="nexirel-demo.txt"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return okError("Not found", 404);
  } catch (e) {
    return okError((e as Error).message, 401);
  }
}
function okError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    rate(req);
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return okError("Invalid origin", 403);
    if (Number(req.headers.get("content-length") || 0) > 15000000)
      return okError("Upload too large", 413);
    const { path } = await params,
      a = path[0],
      b = await req.json();
    if (a === "register" || a === "login") {
      const email = validateText(b.email, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Enter a valid email address.");
      const password = validateText(b.password, 128);
      let u = all("user").find((x) => x.email === email);
      if (a === "register") {
        if (u) throw new Error("An account with that email already exists.");
        if (password.length < 10)
          throw new Error("Use at least 10 characters for your password.");
        const username = validateText(b.username, 24).toLowerCase();
        if (
          !/^[a-z0-9_]{3,24}$/.test(username) ||
          all("user").some((x) => x.username === username)
        )
          throw new Error(
            "Choose a unique username with 3–24 letters, numbers or underscores.",
          );
        u = put("user", {
          id: uid(),
          email,
          password: hash(password),
          name: validateText(b.name, 60),
          username,
          discipline: "Creative explorer",
          bio: "",
          avatar: "",
          createdAt: Date.now(),
        });
      } else if (!u?.password || !verify(password, u.password))
        throw new Error("Email or password is incorrect.");
      if (u.disabled)
        throw new Error("Account suspended. Contact an administrator.");
      const token = uid();
      put("session", {
        id: token,
        userId: u.id,
        expires: Date.now() + 604800000,
      });
      const response = ok({ user: publicUser(u) });
      response.cookies.set("nx_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 604800,
      });
      return response;
    }
    if (a === "recover") {
      return ok({
        message:
          "Password recovery email requires an email provider. Please contact the instance administrator; no reset email was sent.",
      });
    }
    if (a === "logout") {
      const token = req.headers.get("cookie")?.match(/nx_session=([^;]+)/)?.[1];
      if (token) del("session", token);
      const r = ok({ ok: true });
      r.cookies.delete("nx_session");
      return r;
    }
    const u = requireUser(req);
    if (a === "profile") {
      const name = validateText(b.name, 60);
      return ok(
        publicUser(
          put("user", {
            ...u,
            name,
            bio: String(b.bio || "").slice(0, 500),
            discipline: String(b.discipline || "").slice(0, 100),
            website: /^https?:\/\//.test(b.website)
              ? String(b.website).slice(0, 250)
              : "",
            avatar:
              typeof b.avatar === "string" && b.avatar.startsWith("/api/media/")
                ? b.avatar
                : u.avatar,
          }),
        ),
      );
    }
    if (["follow", "like", "save", "block"].includes(a)) {
      const target = validateText(b.target, 100);
      if (a === "follow" && (!get("user", target) || target === u.id))
        throw new Error("Invalid creator");
      const id = `${u.id}:${target}`,
        v = get(a, id);
      if (v) del(a, id);
      else {
        put(a, { id, userId: u.id, target });
        if (a === "follow")
          notify(target, u.id, "started following you", `profile:${u.id}`);
        if (a === "like") {
          const p = get("post", target);
          if (p) notify(p.userId, u.id, "liked your post", `post:${target}`);
        }
      }
      return ok({ active: !v });
    }
    if (a === "post") {
      if (b.delete) {
        const p = get("post", b.id);
        if (p?.userId !== u.id) return okError("Not your post", 403);
        del("post", b.id);
        return ok({ ok: true });
      }
      const caption = validateText(b.caption, 3000),
        media = Array.isArray(b.media) ? b.media.slice(0, 6) : [];
      if (
        media.some(
          (m: string) =>
            !m.startsWith("/api/media/") ||
            get("media", m.split("/").pop()!)?.userId !== u.id ||
            get("media", m.split("/").pop()!)?.private,
        )
      )
        throw new Error("Invalid media");
      const old = b.id ? get("post", b.id) : null;
      if (b.id && old?.userId !== u.id) return okError("Not your post", 403);
      return ok(
        put("post", {
          id: old?.id || uid(),
          userId: u.id,
          title: caption.split("\n")[0].slice(0, 80),
          caption,
          media,
          image: media[0] || "",
          tags: (caption.match(/#[\w]+/g) || []).slice(0, 8),
          likes: 0,
          createdAt: old?.createdAt || Date.now(),
        }),
      );
    }
    if (a === "comment") {
      const p = get("post", b.target);
      if (!p) throw new Error("Post not found");
      const c = put("comment", {
        id: uid(),
        userId: u.id,
        target: b.target,
        text: validateText(b.text, 1000),
        createdAt: Date.now(),
      });
      notify(p.userId, u.id, "commented on your post", `post:${p.id}`);
      return ok(c);
    }
    if (a === "message") {
      const to = get("user", b.to);
      if (!to || to.id === u.id || blocked(u.id, to.id))
        return okError("This conversation is unavailable.", 403);
      if (b.image) {
        const f = get("media", b.image.split("/").pop());
        if (
          !f ||
          f.userId !== u.id ||
          !f.private ||
          !f.type.startsWith("image/")
        )
          throw new Error("Invalid attachment");
        put("media", { ...f, recipientId: to.id });
      }
      return ok(
        put("message", {
          id: uid(),
          from: u.id,
          to: to.id,
          text: b.text ? validateText(b.text, 2000) : "",
          image: b.image || "",
          read: false,
          createdAt: Date.now(),
        }),
      );
    }
    if (a === "read") {
      all("message")
        .filter((x) => x.to === u.id && x.from === b.from)
        .forEach((x) => put("message", { ...x, read: true }));
      all("notification")
        .filter((x) => x.userId === u.id)
        .forEach((x) => put("notification", { ...x, read: true }));
      return ok({ ok: true });
    }
    if (a === "upload") {
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "application/zip",
        "application/x-zip-compressed",
        "application/pdf",
        "application/octet-stream",
      ];
      if (!allowed.includes(b.type))
        throw new Error(
          "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, ZIP or PDF.",
        );
      if (typeof b.base64 !== "string") throw new Error("Invalid file");
      const bytes = Buffer.from(b.base64, "base64");
      if (
        b.type === "image/png" &&
        bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
      )
        throw new Error("Invalid PNG file.");
      if (
        b.type === "image/jpeg" &&
        bytes.subarray(0, 3).toString("hex") !== "ffd8ff"
      )
        throw new Error("Invalid JPEG file.");
      if (
        b.type === "image/webp" &&
        (bytes.subarray(0, 4).toString() !== "RIFF" ||
          bytes.subarray(8, 12).toString() !== "WEBP")
      )
        throw new Error("Invalid WebP file.");
      if (
        b.type === "image/gif" &&
        !bytes
          .subarray(0, 6)
          .toString()
          .match(/^GIF8[79]a$/)
      )
        throw new Error("Invalid GIF file.");
      if (
        b.type === "application/pdf" &&
        !bytes.subarray(0, 5).toString().startsWith("%PDF-")
      )
        throw new Error("Invalid PDF file.");
      if (bytes.length > 10 * 1024 * 1024 || !bytes.length)
        throw new Error("Files must be between 1 byte and 10 MB.");
      if (
        !b.private &&
        !b.type.startsWith("image/") &&
        !b.type.startsWith("video/")
      )
        throw new Error("Product files must be private.");
      const f = put("media", {
        id: uid(),
        userId: u.id,
        name: validateText(b.name, 150),
        type: b.type,
        base64: b.base64,
        private: !!b.private,
      });
      return ok({ id: f.id, url: `/api/media/${f.id}` });
    }
    if (a === "product") {
      const old = b.id ? get("product", b.id) : null;
      if (old && old.userId !== u.id) return okError("Not your listing", 403);
      const price = Number(b.price);
      if (!Number.isFinite(price) || price < 1 || price > 10000)
        throw new Error("Price must be between $1 and $10,000.");
      const f = get("media", b.fileId || old?.fileId);
      if (!f || !f.private || f.userId !== u.id)
        throw new Error("Upload a private product file first.");
      if (
        b.image &&
        (!b.image.startsWith("/api/media/") ||
          get("media", b.image.split("/").pop())?.private)
      )
        throw new Error("Invalid public preview");
      return ok(
        put("product", {
          id: old?.id || uid(),
          userId: u.id,
          title: validateText(b.title, 100),
          description: validateText(b.description, 5000),
          price,
          category: b.category || "Templates",
          format: String(b.format || "ZIP").slice(0, 100),
          software: String(b.software || "See documentation").slice(0, 200),
          licence: String(
            b.licence || "Personal use. No redistribution.",
          ).slice(0, 1000),
          fileId: f.id,
          image: b.image || old?.image || "",
          status: ["draft", "published", "archived"].includes(b.status)
            ? b.status
            : "draft",
          createdAt: old?.createdAt || Date.now(),
        }),
      );
    }
    if (a === "checkout") {
      if (
        !process.env.STRIPE_SECRET_KEY &&
        process.env.NODE_ENV === "production" &&
        process.env.ENABLE_DEV_CHECKOUT !== "true"
      )
        return okError(
          "Development checkout is disabled. Configure a payment provider before accepting orders.",
          503,
        );
      const p = get("product", b.productId);
      if (!p || p.status !== "published")
        throw new Error("Product unavailable.");
      if (p.userId === u.id)
        throw new Error("You cannot purchase your own product.");
      const prior = all("order").find(
        (x) => x.userId === u.id && x.productId === p.id && x.status === "paid",
      );
      if (prior) return ok(prior);
      if (process.env.STRIPE_SECRET_KEY) return ok(await createCheckout(u, p));
      const order = put("order", {
        id: uid(),
        userId: u.id,
        productId: p.id,
        title: p.title,
        amount: p.price,
        status: "paid",
        mode: "development",
        createdAt: Date.now(),
      });
      notify(p.userId, u.id, "made a development purchase", `seller`);
      notify(u.id, p.userId, "Your development download is ready", "downloads");
      return ok(order);
    }
    if (a === "download-link") {
      const order = get("order", b.orderId);
      if (!order || order.userId !== u.id || order.status !== "paid")
        return okError("Purchase required", 403);
      const expires = Date.now() + 60000;
      return ok({
        url: `/api/download/${order.id}?expires=${expires}&signature=${sign(`${order.id}:${u.id}:${expires}`)}`,
      });
    }
    if (a === "report") {
      return ok(
        put("report", {
          id: uid(),
          userId: u.id,
          target: validateText(b.target, 100),
          reason: validateText(b.reason, 1000),
          createdAt: Date.now(),
          status: "open",
        }),
      );
    }
    if (a === "admin") {
      if (u.role !== "admin")
        return okError("Administrator access required", 403);
      if (b.kind === "report") {
        const v = get("report", b.id);
        if (v) put("report", { ...v, status: "reviewed" });
      }
      if (b.kind === "user") {
        const v = get("user", b.id);
        if (v) put("user", { ...v, disabled: !v.disabled });
      }
      if (b.kind === "product") {
        const v = get("product", b.id);
        if (v) put("product", { ...v, status: "archived" });
      }
      return ok({ ok: true });
    }
    return okError("Not found", 404);
  } catch (e) {
    return okError((e as Error).message);
  }
}
