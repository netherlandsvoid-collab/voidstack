import type { HttpStack, UploadOptions } from "tus-js-client";
export type UploadControls = { pause: () => Promise<void>; resume: () => void };
export type TransferOptions = {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onControls?: (controls: UploadControls) => void;
};
export async function uploadResumable(
  file: File,
  ticket: { bucket: string; path: string; token: string },
  config: { url: string; key: string; type: string },
  options: TransferOptions = {},
  // Native browser XHR is the production default. Tests can supply an isolated stack.
  transport: { httpStack?: HttpStack; retryDelays?: number[] } = {},
) {
  const { Upload } = await import("tus-js-client");
  const base = new URL(config.url);
  if (/^[a-z0-9]+\.supabase\.co$/.test(base.hostname))
    base.hostname = base.hostname.replace(
      ".supabase.co",
      ".storage.supabase.co",
    );
  // createSignedUploadUrl tokens authorize the signed TUS route only. The
  // ordinary route expects a user JWT and would apply anonymous RLS here.
  const endpoint = new URL(
    "/storage/v1/upload/resumable/sign",
    base,
  ).toString();
  if (options.signal?.aborted)
    throw new DOMException("Upload cancelled", "AbortError");
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", cancel);
      error ? reject(error) : resolve();
    };
    const upload = new Upload(file, {
      endpoint,
      headers: {
        apikey: config.key,
        "x-signature": ticket.token,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: ticket.bucket,
        objectName: ticket.path,
        contentType: config.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      // Read at most one chunk at a time, including in isolated Node tests.
      fileReader: {
        openFile: async (input: File) => ({
          size: input.size,
          slice: async (start: number, end: number) => ({
            value: input.slice(start, end),
            done: end >= input.size,
          }),
          close() {},
        }),
      },
      ...transport,
      onProgress: (sent, total) =>
        options.onProgress?.(
          total ? Math.min(99, Math.floor((sent / total) * 100)) : 0,
        ),
      onBeforeRequest: (request) => {
        const xhr = request.getUnderlyingObject();
        if (xhr && "timeout" in xhr) xhr.timeout = 180000;
      },
      onError: (error) => {
        const status =
          "originalResponse" in error
            ? error.originalResponse?.getStatus()
            : undefined;
        finish(
          new Error(
            status === 401 || status === 403
              ? `Upload authorization was rejected (HTTP ${status}). Select the file again to request a fresh upload. If this continues, contact the site administrator.`
              : `Upload interrupted${status ? ` (HTTP ${status})` : ""}. Check your connection, storage limit, and bucket settings, then retry.`,
          ),
        );
      },
      onSuccess: () => finish(),
    } satisfies UploadOptions);
    const cancel = () => {
      void upload
        .abort()
        .catch(() => {})
        .finally(() =>
          finish(new DOMException("Upload cancelled", "AbortError")),
        );
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    options.onControls?.({
      pause: async () => {
        await upload.abort();
      },
      resume: () => {
        if (!settled) upload.start();
      },
    });
    upload.start();
  });
}
