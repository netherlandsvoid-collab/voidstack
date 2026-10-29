import { createCheckout } from "@/lib/payments";
import { NextResponse } from "next/server";
import {
  all,
  get,
  put,
  del,
  uid,
  authClient,
  withAuth,
  BackendError,
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
async function handleGET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  try {
    const { path } = await params;
    const u = await session(req),
      url = new URL(req.url);
    if (path[0] === "state") {
      const kinds = [
        "user",
        "block",
        "media",
        "post",
        "like",
        "product",
        "follow",
        "save",
        "comment",
        "notification",
        "order",
        "message",
        "report",
      ];
      const values = await Promise.all(kinds.map((kind) => all(kind)));
      const records = Object.fromEntries(
        kinds.map((kind, i) => [kind, values[i]]),
      );
      const followers = records.follow;
      const exposeUser = (profile: any) => {
        if (!profile) return null;
        const { password, email, ...safe } = profile;
        return {
          ...safe,
          followers: followers.filter((f: any) => f.target === profile.id)
            .length,
        };
      };
      const users = records.user.map(exposeUser);
      const blocks = u
        ? records.block
            .filter((x: any) => x.userId === u.id)
            .map((x: any) => x.target)
        : [];
      return ok({
        mediaTypes: Object.fromEntries(
          records.media
            .filter((m: any) => !m.private)
            .map((m: any) => ["/api/media/" + m.id, m.type]),
        ),
        me: exposeUser(u),
        users,
        posts: records.post
          .filter((x: any) => !blocks.includes(x.userId))
          .map((p: any) => ({
            ...p,
            likes:
              (p.likes || 0) +
              records.like.filter(
                (l: any) => l.target === p.id && l.userId !== u?.id,
              ).length,
          }))
          .sort((a: any, b: any) => b.createdAt - a.createdAt),
        products: records.product
          .filter((x: any) => x.status === "published" || x.userId === u?.id)
          .map(({ fileId, ...p }: any) => p),
        follows: u
          ? followers
              .filter((x: any) => x.userId === u.id)
              .map((x: any) => x.target)
          : [],
        likes: u
          ? records.like
              .filter((x: any) => x.userId === u.id)
              .map((x: any) => x.target)
          : [],
        saved: u
          ? records.save
              .filter((x: any) => x.userId === u.id)
              .map((x: any) => x.target)
          : [],
        comments: records.comment,
        notifications: u
          ? records.notification.filter((x: any) => x.userId === u.id)
          : [],
        orders: u ? records.order.filter((x: any) => x.userId === u.id) : [],
        sellerOrders: u
          ? records.order.filter(
              (x: any) =>
                records.product.find((p: any) => p.id === x.productId)
                  ?.userId === u.id,
            )
          : [],
        messages: u
          ? records.message.filter((x: any) => x.from === u.id || x.to === u.id)
          : [],
        reports: u?.role === "admin" ? records.report : [],
        adminUsers: u?.role === "admin" ? users : [],
        developmentCheckout: !process.env.STRIPE_SECRET_KEY,
      });
    }
    if (path[0] === "download") {
      const user = await requireUser(req),
        order = await get("order", path[1]);
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
      const p = await get("product", order.productId),
        f = p?.fileId ? await get("media", p.fileId) : null;
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
    return okError((e as Error).message, e instanceof BackendError ? 503 : 401);
  }
}
function okError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
async function handlePOST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      path: string[];
    }>;
  },
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
      if (
        typeof b.password !== "string" ||
        !b.password.length ||
        b.password.length > 128
      )
        throw new Error("Enter a password of at most 128 characters.");
      const password = b.password;
      const auth = authClient().auth;
      if (a === "register") {
        if (password.length < 10)
          throw new Error("Use at least 10 characters for your password.");
        const username = validateText(b.username, 24).toLowerCase();
        if (
          !/^[a-z0-9_]{3,24}$/.test(username) ||
          (await all("user")).some((x) => x.username === username)
        )
          throw new Error(
            "Choose a unique username with 3–24 letters, numbers or underscores.",
          );
        const name = validateText(b.name, 60);
        const { data, error } = await auth.signUp({
          email,
          password,
          options: { data: { username, name } },
        });
        if (error) throw new Error(error.message);
        if (!data.session)
          return ok({
            confirmationRequired: true,
            message: "Check your email to confirm your account, then sign in.",
          });
        if (!data.user)
          throw new Error(
            "Signup did not return a user. Please try signing in.",
          );
        const profile = await get("user", data.user.id);
        if (!profile)
          throw new BackendError(
            "Account profile is missing. Check the Supabase signup migration.",
          );
        return ok({ user: await publicUser(profile) });
      }
      const { data, error } = await auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const profile = await get("user", data.user.id);
      if (!profile)
        throw new BackendError(
          "Account profile is missing. Check the Supabase signup migration.",
        );
      if (profile.disabled) {
        await auth.signOut();
        throw new Error("Account suspended. Contact an administrator.");
      }
      return ok({ user: await publicUser(profile) });
    }
    if (a === "recover") {
      return ok({
        message:
          "Password recovery email requires an email provider. Please contact the instance administrator; no reset email was sent.",
      });
    }
    if (a === "logout") {
      const { error } = await authClient().auth.signOut();
      if (error) throw new Error(error.message);
      return ok({ ok: true });
    }
    const u = await requireUser(req);
    if (a === "profile") {
      const name = validateText(b.name, 60);
      return ok(
        await publicUser(
          await put("user", {
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
      if (a === "follow" && (!(await get("user", target)) || target === u.id))
        throw new Error("Invalid creator");
      const id = `${u.id}:${target}`,
        v = await get(a, id);
      if (v) await del(a, id);
      else {
        await put(a, { id, userId: u.id, target });
        if (a === "follow")
          await notify(
            target,
            u.id,
            "started following you",
            `profile:${u.id}`,
          );
        if (a === "like") {
          const p = await get("post", target);
          if (p)
            await notify(p.userId, u.id, "liked your post", `post:${target}`);
        }
      }
      return ok({ active: !v });
    }
    if (a === "post") {
      if (b.delete) {
        const p = await get("post", b.id);
        if (p?.userId !== u.id) return okError("Not your post", 403);
        await del("post", b.id);
        return ok({ ok: true });
      }
      const caption = validateText(b.caption, 3000),
        media = Array.isArray(b.media) ? b.media.slice(0, 6) : [];
      for (const m of media) {
        if (typeof m !== "string" || !m.startsWith("/api/media/"))
          throw new Error("Invalid media");
        const file = await get("media", m.split("/").pop()!);
        if (!file || file.userId !== u.id || file.private)
          throw new Error("Invalid media");
      }
      const old = b.id ? await get("post", b.id) : null;
      if (b.id && old?.userId !== u.id) return okError("Not your post", 403);
      return ok(
        await put("post", {
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
      const p = await get("post", b.target);
      if (!p) throw new Error("Post not found");
      const c = await put("comment", {
        id: uid(),
        userId: u.id,
        target: b.target,
        text: validateText(b.text, 1000),
        createdAt: Date.now(),
      });
      await notify(p.userId, u.id, "commented on your post", `post:${p.id}`);
      return ok(c);
    }
    if (a === "message") {
      const to = await get("user", b.to);
      if (!to || to.id === u.id || (await blocked(u.id, to.id)))
        return okError("This conversation is unavailable.", 403);
      if (b.image) {
        const f = await get("media", b.image.split("/").pop());
        if (
          !f ||
          f.userId !== u.id ||
          !f.private ||
          !f.type.startsWith("image/")
        )
          throw new Error("Invalid attachment");
        await put("media", { ...f, recipientId: to.id });
      }
      return ok(
        await put("message", {
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
      for (const message of (await all("message")).filter(
        (x) => x.to === u.id && x.from === b.from,
      ))
        await put("message", { ...message, read: true });
      for (const notification of (await all("notification")).filter(
        (x) => x.userId === u.id,
      ))
        await put("notification", { ...notification, read: true });
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
      const f = await put("media", {
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
      const old = b.id ? await get("product", b.id) : null;
      if (old && old.userId !== u.id) return okError("Not your listing", 403);
      const price = Number(b.price);
      if (!Number.isFinite(price) || price < 1 || price > 10000)
        throw new Error("Price must be between $1 and $10,000.");
      const f = await get("media", b.fileId || old?.fileId);
      if (!f || !f.private || f.userId !== u.id)
        throw new Error("Upload a private product file first.");
      if (
        b.image &&
        (!b.image.startsWith("/api/media/") ||
          (await get("media", b.image.split("/").pop()))?.private)
      )
        throw new Error("Invalid public preview");
      return ok(
        await put("product", {
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
      const p = await get("product", b.productId);
      if (!p || p.status !== "published")
        throw new Error("Product unavailable.");
      if (p.userId === u.id)
        throw new Error("You cannot purchase your own product.");
      const prior = (await all("order")).find(
        (x) => x.userId === u.id && x.productId === p.id && x.status === "paid",
      );
      if (prior) return ok(prior);
      if (process.env.STRIPE_SECRET_KEY) return ok(await createCheckout(u, p));
      const order = await put("order", {
        id: uid(),
        userId: u.id,
        productId: p.id,
        title: p.title,
        amount: p.price,
        status: "paid",
        mode: "development",
        createdAt: Date.now(),
      });
      await notify(p.userId, u.id, "made a development purchase", `seller`);
      await notify(
        u.id,
        p.userId,
        "Your development download is ready",
        "downloads",
      );
      return ok(order);
    }
    if (a === "download-link") {
      const order = await get("order", b.orderId);
      if (!order || order.userId !== u.id || order.status !== "paid")
        return okError("Purchase required", 403);
      const expires = Date.now() + 60000;
      return ok({
        url: `/api/download/${order.id}?expires=${expires}&signature=${sign(`${order.id}:${u.id}:${expires}`)}`,
      });
    }
    if (a === "report") {
      return ok(
        await put("report", {
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
        const v = await get("report", b.id);
        if (v) await put("report", { ...v, status: "reviewed" });
      }
      if (b.kind === "user") {
        const v = await get("user", b.id);
        if (v) await put("user", { ...v, disabled: !v.disabled });
      }
      if (b.kind === "product") {
        const v = await get("product", b.id);
        if (v) await put("product", { ...v, status: "archived" });
      }
      return ok({ ok: true });
    }
    return okError("Not found", 404);
  } catch (e) {
    return okError((e as Error).message, e instanceof BackendError ? 503 : 400);
  }
}
export async function GET(
  req: Request,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return withAuth(req, () => handleGET(req, context));
}
export async function POST(
  req: Request,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
) {
  return withAuth(req, () => handlePOST(req, context));
}
