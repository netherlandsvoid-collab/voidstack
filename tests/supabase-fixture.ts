// Real Supabase SDKs against an isolated HTTP fixture; never writes to production.
export function installSupabaseFixture() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture";
  const records = new Map<string, any>();
  const accounts = new Map<string, any>();
  const storageObjects = new Map<string, { bytes: Buffer; type: string }>();
  const uploadTokens = new Map<string, string>();
  const recoveryRequests: {
    email: string;
    redirectTo: string;
    tokenHash?: string;
  }[] = [];
  const recoveryTokens = new Map<string, string>();
  let recoveryFailure = 0;
  const tusUploads = new Map<
    string,
    {
      bucket: string;
      path: string;
      type: string;
      size: number;
      chunks: Buffer[];
      offset: number;
    }
  >();
  const tusRequests: { method: string; offset: number; size: number }[] = [];
  let failNextPatch = false;
  let bucketExists = true;
  let failBulk = false;
  const emailRequests: {
    oldEmail: string;
    newEmail: string;
    redirectTo: string;
  }[] = [];
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
  const token = (u: any, recovery = false) => {
    const encode = (v: any) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    return {
      access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: u.id, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), role: "authenticated", amr: [{ method: recovery ? "recovery" : "password" }] })}.signature`,
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
    if (
      ![
        "https://fixture.supabase.co",
        "https://fixture.storage.supabase.co",
      ].includes(url.origin)
    )
      throw new Error(
        "Unexpected network request in isolated test: " + url.origin,
      );
    if (unavailable)
      return json({ code: "PGRST205", message: "Missing runtime table" }, 503);
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    if (url.pathname.startsWith("/storage/v1/")) {
      if (!bucketExists)
        return json(
          {
            message: "Bucket not found",
            statusCode: "404",
            error: "not_found",
          },
          400,
        );
      if (url.pathname.startsWith("/storage/v1/upload/resumable")) {
        const headers = new Headers(init?.headers);
        if (headers.get("apikey") !== "sb_publishable_fixture")
          return json({ message: "Invalid API key" }, 403);
        // Signed-upload tokens are accepted only on the signed TUS route.
        // The ordinary route needs a user JWT/RLS permission, not x-signature.
        const signedRoot = "/storage/v1/upload/resumable/sign";
        if (
          url.pathname !== signedRoot &&
          !url.pathname.startsWith(signedRoot + "/")
        )
          return json(
            { message: "new row violates row-level security policy" },
            403,
          );
        let id = url.pathname.slice(signedRoot.length + 1);
        if (method === "POST") {
          const metadata = Object.fromEntries(
            (headers.get("upload-metadata") || "").split(",").map((part) => {
              const [k, v] = part.trim().split(" ");
              return [k, Buffer.from(v || "", "base64").toString()];
            }),
          );
          if (
            uploadTokens.get(headers.get("x-signature") || "") !==
            metadata.bucketName + "/" + metadata.objectName
          )
            return json({ message: "Invalid signature" }, 403);
          id = "tus_" + tusUploads.size;
          tusUploads.set(id, {
            bucket: metadata.bucketName,
            path: metadata.objectName,
            type: metadata.contentType,
            size: Number(headers.get("upload-length")),
            chunks: [],
            offset: 0,
          });
        }
        const upload = tusUploads.get(id);
        if (!upload) return json({ message: "Unknown upload" }, 404);
        if (
          uploadTokens.get(headers.get("x-signature") || "") !==
          upload.bucket + "/" + upload.path
        )
          return json({ message: "Invalid signature" }, 403);
        if (method === "HEAD") {
          tusRequests.push({ method, offset: upload.offset, size: 0 });
          return new Response(null, {
            status: 200,
            headers: {
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": String(upload.offset),
              "Upload-Length": String(upload.size),
            },
          });
        }
        if (method === "PATCH" && failNextPatch) {
          failNextPatch = false;
          return json({ message: "Temporary interruption" }, 503);
        }
        if (
          method === "PATCH" &&
          Number(headers.get("upload-offset")) !== upload.offset
        )
          return json({ message: "Wrong offset" }, 409);
        const bytes = init?.body
          ? Buffer.from(await new Response(init.body as BodyInit).arrayBuffer())
          : Buffer.alloc(0);
        tusRequests.push({ method, offset: upload.offset, size: bytes.length });
        upload.chunks.push(bytes);
        upload.offset += bytes.length;
        if (upload.offset === upload.size)
          storageObjects.set(upload.bucket + "/" + upload.path, {
            bytes: Buffer.concat(upload.chunks),
            type: upload.type,
          });
        return new Response(null, {
          status: method === "POST" ? 201 : 204,
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": String(upload.offset),
            Location:
              "https://fixture.storage.supabase.co/storage/v1/upload/resumable/sign/" +
              id,
          },
        });
      }
      const root = "/storage/v1/object/";
      const bucket =
        url.pathname.match(
          /\/object\/(?:upload\/sign|sign|info)\/([^/]+)/,
        )?.[1] || "voidstack-media";
      const objectKey = (path: string) =>
        bucket === "voidstack-media" ? path : bucket + "/" + path;
      const upload = root + "upload/sign/" + bucket + "/";
      const signed = root + "sign/" + bucket + "/";
      const info = root + "info/" + bucket + "/";
      if (url.pathname.startsWith(upload)) {
        const path = url.pathname.slice(upload.length);
        if (method === "POST") {
          const token = "upload_" + path.replaceAll("/", "_");
          uploadTokens.set(token, bucket + "/" + path);
          return json({
            url:
              "/object/upload/sign/" + bucket + "/" + path + "?token=" + token,
          });
        }
        if (method === "PUT") {
          if (
            uploadTokens.get(url.searchParams.get("token") || "") !==
            bucket + "/" + path
          )
            return json({ message: "Invalid upload token" }, 403);
          if (storageObjects.has(objectKey(path)))
            return json({ message: "The resource already exists" }, 409);
          const form = init?.body as FormData;
          const file = [...form.values()].find(
            (v) => v instanceof Blob,
          ) as File;
          if (!file) throw new Error("Expected direct multipart file upload");
          storageObjects.set(objectKey(path), {
            bytes: Buffer.from(await file.arrayBuffer()),
            type: file.type,
          });
          return json({ Key: "voidstack-media/" + path });
        }
      }
      if (url.pathname.startsWith(info)) {
        const object = storageObjects.get(
          objectKey(url.pathname.slice(info.length)),
        );
        return object
          ? json({ size: object.bytes.length, content_type: object.type })
          : json({ message: "Object not found" }, 404);
      }
      if (url.pathname.startsWith(signed)) {
        const path = url.pathname.slice(signed.length);
        if (method === "POST")
          return json({
            signedURL:
              "/object/sign/" + bucket + "/" + path + "?token=read_fixture",
          });
        const object = storageObjects.get(objectKey(path));
        if (!object) return json({ message: "Object not found" }, 404);
        if (url.searchParams.get("token") !== "read_fixture")
          return json({ message: "Invalid read token" }, 403);
        return new Response(new Uint8Array(object.bytes.subarray(0, 32)), {
          status: 206,
          headers: { "content-type": object.type },
        });
      }
      throw new Error("Unhandled storage URL: " + url.pathname);
    }
    if (url.pathname.startsWith("/rest/v1/voidstack_records")) {
      if (new Headers(init?.headers).get("apikey") !== "sb_secret_fixture")
        return json({ message: "Permission denied" }, 403);
      const kind = url.searchParams.get("kind")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      if (method === "POST") {
        if (Array.isArray(body)) {
          if (failBulk)
            return json(
              { code: "XX000", message: "Simulated transaction failure" },
              400,
            );
          for (const row of body) records.set(row.kind + ":" + row.id, row);
        } else if (!(
          new Headers(init?.headers)
            .get("prefer")
            ?.includes("resolution=ignore-duplicates") &&
          records.has(body.kind + ":" + body.id)
        ))
          records.set(body.kind + ":" + body.id, body);
        return new Response(null, { status: 201 });
      }
      if (method === "PATCH") {
        const row = records.get(kind + ":" + id);
        const matches =
          row &&
          [...url.searchParams].every(
            ([key, value]) =>
              !key.startsWith("data->>") ||
              String(row.data[key.slice(7)]) === value.replace(/^eq\./, ""),
          );
        if (!matches) return json([]);
        const updated = { ...row, ...body };
        records.set(kind + ":" + id, updated);
        return json([updated]);
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
    if (url.pathname.endsWith("/recover")) {
      if (recoveryFailure)
        return json({ message: "Email service unavailable" }, recoveryFailure);
      const u = accounts.get(body.email);
      const tokenHash = u
        ? "recovery_token_" + String(++counter).padStart(20, "0")
        : undefined;
      if (tokenHash) recoveryTokens.set(tokenHash, body.email);
      recoveryRequests.push({
        email: body.email,
        redirectTo: url.searchParams.get("redirect_to") || "",
        tokenHash,
      });
      return json({});
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
      if (url.searchParams.get("grant_type") === "pkce") {
        u = [...accounts.values()].find((u) => u.new_email);
        if (
          body.auth_code !== "email-change-valid" ||
          !u ||
          !body.code_verifier
        )
          return json({ message: "Invalid authorization code" }, 400);
        accounts.delete(u.email);
        u.email = u.new_email;
        delete u.new_email;
        accounts.set(u.email, u);
        const { password, confirmed, ...safe } = u;
        return json(token(safe));
      }
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
      if (body.type === "recovery") {
        const email = recoveryTokens.get(body.token_hash);
        const user = email ? accounts.get(email) : null;
        if (!user)
          return json({ message: "Token expired", code: "otp_expired" }, 403);
        recoveryTokens.delete(body.token_hash);
        const { password, confirmed, ...safe } = user;
        return json(token(safe, true));
      }

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
      if (method === "PUT") {
        if (body.password) {
          const claims = JSON.parse(
            Buffer.from(bearer!.split(".")[1], "base64url").toString(),
          );
          if (
            body.current_password !== u.password &&
            !claims.amr?.some((a: any) => a.method === "recovery")
          )
            return json({ message: "Current password is incorrect" }, 400);
          u.password = body.password;
        }
        if (body.email) {
          u.new_email = body.email;
          emailRequests.push({
            oldEmail: u.email,
            newEmail: body.email,
            redirectTo: url.searchParams.get("redirect_to") || "",
          });
        }
      }
      const { password, confirmed, ...safe } = u;
      return json(safe);
    }
    if (url.pathname.endsWith("/logout"))
      return new Response(null, { status: 204 });
    throw new Error("Unhandled fixture URL: " + url.pathname);
  };
  return {
    records,
    accounts,
    storageObjects,
    emailRequests,
    recoveryRequests,
    tusRequests,
    setFailNextPatch: () => {
      failNextPatch = true;
    },
    recoveryTokens,
    setRecoveryFailure: (status: number) => {
      recoveryFailure = status;
    },
    setFailBulk: (value: boolean) => {
      failBulk = value;
    },
    setBucketExists: (value: boolean) => {
      bucketExists = value;
    },
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
