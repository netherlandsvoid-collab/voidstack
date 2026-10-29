// Real Supabase SDKs against an isolated HTTP fixture; never writes to production.
export function installSupabaseFixture() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture";
  const records = new Map<string, any>();
  const accounts = new Map<string, any>();
  let confirmationRequired = false;
  let unavailable = false;
  let counter = 0;
  const originalFetch = globalThis.fetch;
  const json = (data: any, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  const profile = (u: any) => ({
    id: u.id,
    username: u.user_metadata.username,
    name: u.user_metadata.name,
    bio: "",
    avatar: "",
    discipline: "Creative explorer",
    createdAt: Date.now(),
  });
  const token = (u: any) => {
    const encode = (v: any) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    return {
      access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: u.id, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), role: "authenticated" })}.signature`,
      refresh_token: "refresh_" + u.id,
      expires_in: 3600,
      token_type: "bearer",
      user: u,
    };
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.origin !== "https://fixture.supabase.co")
      throw new Error(
        "Unexpected network request in isolated test: " + url.origin,
      );
    if (unavailable)
      return json({ code: "PGRST205", message: "Missing runtime table" }, 503);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    if (url.pathname.startsWith("/rest/v1/voidstack_records")) {
      if (new Headers(init?.headers).get("apikey") !== "sb_secret_fixture")
        return json({ message: "Permission denied" }, 403);
      const kind = url.searchParams.get("kind")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      if (method === "POST") {
        records.set(body.kind + ":" + body.id, body);
        return new Response(null, { status: 201 });
      }
      if (method === "DELETE") {
        records.delete(kind + ":" + id);
        return new Response(null, { status: 204 });
      }
      let rows = [...records.values()]
        .filter((r) => (!kind || r.kind === kind) && (!id || r.id === id))
        .sort((a, b) => a.id.localeCompare(b.id));
      const offset = Number(url.searchParams.get("offset") || 0),
        limit = Number(url.searchParams.get("limit") || 1000);
      rows = rows.slice(offset, offset + limit);
      return json(rows);
    }
    if (url.pathname.endsWith("/signup")) {
      if (accounts.has(body.email))
        return json({ message: "User already registered" }, 422);
      const u = {
        id: `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
        email: body.email,
        aud: "authenticated",
        role: "authenticated",
        created_at: new Date().toISOString(),
        user_metadata: body.data || {},
        identities: [{ id: "identity" }],
      };
      accounts.set(body.email, {
        ...u,
        password: body.password,
        confirmed: !confirmationRequired,
      });
      records.set("user:" + u.id, { kind: "user", id: u.id, data: profile(u) });
      return json(confirmationRequired ? { user: u, session: null } : token(u));
    }
    if (url.pathname.endsWith("/token")) {
      let u;
      if (url.searchParams.get("grant_type") === "refresh_token")
        u = [...accounts.values()].find(
          (u) => "refresh_" + u.id === body.refresh_token,
        );
      else u = accounts.get(body.email);
      if (!u || (body.password && body.password !== u.password))
        return json(
          { message: "Invalid login credentials", code: "invalid_credentials" },
          400,
        );
      if (!u.confirmed)
        return json(
          { message: "Email not confirmed", code: "email_not_confirmed" },
          400,
        );
      const { password, confirmed, ...safe } = u;
      return json(token(safe));
    }
    if (url.pathname.endsWith("/verify")) {
      const u = accounts.get("confirm@example.com");
      if (body.token_hash !== "confirm-valid" || !u)
        return json({ message: "Token expired" }, 403);
      u.confirmed = true;
      const { password, confirmed, ...safe } = u;
      return json(token(safe));
    }
    if (url.pathname.endsWith("/user")) {
      const bearer = new Headers(init?.headers)
        .get("authorization")
        ?.replace(/^Bearer /, "");
      const sub = bearer
        ? JSON.parse(Buffer.from(bearer.split(".")[1], "base64url").toString())
            .sub
        : "";
      const u = [...accounts.values()].find((u) => u.id === sub);
      if (!u) return json({ message: "Invalid token" }, 401);
      const { password, ...safe } = u;
      return json(safe);
    }
    if (url.pathname.endsWith("/logout"))
      return new Response(null, { status: 204 });
    throw new Error("Unhandled fixture URL: " + url.pathname);
  };
  return {
    records,
    accounts,
    setConfirmationRequired: (v: boolean) => {
      confirmationRequired = v;
    },
    setUnavailable: (v: boolean) => {
      unavailable = v;
    },
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}
