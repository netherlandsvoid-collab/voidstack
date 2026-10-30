import { createClient } from "@supabase/supabase-js";
import {
  MEDIA_MAX_BYTES,
  formatBytes,
  uploadContentType,
} from "./upload-limits";
import { uploadResumable, type TransferOptions } from "./resumable-upload";
export async function uploadDirect(
  file: File,
  privateFile: boolean,
  api: (action: string, body: Record<string, any>) => Promise<any>,
  options: TransferOptions & { purpose?: "product"; maxBytes?: number } = {},
) {
  const product = options.purpose === "product";
  const MAX_BYTES = product
    ? (options.maxBytes ?? 50 * 1024 * 1024)
    : MEDIA_MAX_BYTES;
  if (!file.size || file.size > MAX_BYTES)
    throw new Error(
      `Choose a file between 1 byte and ${formatBytes(MAX_BYTES)}.`,
    );
  const type = uploadContentType(file, product);
  const ticket = await api("upload-init", {
    name: file.name,
    type,
    size: file.size,
    private: privateFile,
    ...(product ? { purpose: "product" } : {}),
  });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "File storage is not configured. Please contact the site administrator.",
    );
  // Isolated, stateless client: the scoped signed token authorizes this one path.
  // No server secret or app authentication cookies are sent to the browser.
  const storage = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  if (product) {
    await uploadResumable(file, ticket, { url, key, type }, options);
    options.onProgress?.(99);
    const result = await api("upload-complete", { id: ticket.id });
    options.onProgress?.(100);
    return { ...result, name: file.name, size: file.size };
  }
  const { error } = await storage.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type });
  if (error)
    throw new Error(`The file could not be uploaded: ${error.message}`);
  return api("upload-complete", { id: ticket.id });
}
