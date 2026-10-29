import { createClient } from "@supabase/supabase-js";
const MAX_BYTES = 10 * 1024 * 1024;
export async function uploadDirect(
  file: File,
  privateFile: boolean,
  api: (action: string, body: Record<string, any>) => Promise<any>,
) {
  if (!file.size || file.size > MAX_BYTES)
    throw new Error("Choose a file between 1 byte and 10 MB.");
  const type = file.type || "application/octet-stream";
  const ticket = await api("upload-init", {
    name: file.name,
    type,
    size: file.size,
    private: privateFile,
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
  const { error } = await storage.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: type });
  if (error)
    throw new Error(`The file could not be uploaded: ${error.message}`);
  return api("upload-complete", { id: ticket.id });
}
