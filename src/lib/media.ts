import {
  BackendError,
  database,
  del,
  get,
  put,
  uid,
  validateText,
} from "./server";

export const MEDIA_BUCKET = "voidstack-media";
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/pdf": "pdf",
  "application/octet-stream": "bin",
};
function storageError(error: { message: string }): never {
  console.error("Supabase storage:", error.message);
  throw new BackendError(
    "File storage is unavailable. Check the voidstack-media bucket setup.",
  );
}
export async function beginUpload(user: any, body: any) {
  const name = validateText(body.name, 150);
  const type = body.type;
  if (typeof type !== "string" || !Object.hasOwn(extensions, type))
    throw new Error(
      "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM, ZIP or PDF.",
    );
  if (
    !Number.isSafeInteger(body.size) ||
    body.size < 1 ||
    body.size > MAX_MEDIA_BYTES
  )
    throw new Error("Files must be between 1 byte and 10 MB.");
  const isPrivate = !!body.private;
  if (!isPrivate && !type.startsWith("image/") && !type.startsWith("video/"))
    throw new Error("Product files must be private.");
  const id = uid();
  const storagePath = `${user.id}/${id}.${extensions[type]}`;
  const { data, error } = await database()
    .storage.from(MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error) storageError(error);
  await put("media-upload", {
    id,
    userId: user.id,
    name,
    type,
    size: body.size,
    private: isPrivate,
    storagePath,
    expires: Date.now() + 2 * 60 * 60 * 1000,
  });
  return { id, bucket: MEDIA_BUCKET, path: storagePath, token: data!.token };
}

// Read only enough bytes to check the file signature. Never proxy the full file
// through a Vercel function, including when storage ignores the Range header.
async function prefix(storagePath: string): Promise<Buffer> {
  const url = await signedMediaUrl({ storagePath });
  const response = await fetch(url, {
    headers: { Range: "bytes=0-31" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.body)
    throw new BackendError("Could not verify the uploaded file. Please retry.");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (size < 32) {
      const result = await reader.read();
      if (result.done) break;
      const chunk = Buffer.from(result.value.subarray(0, 32 - size));
      chunks.push(chunk);
      size += chunk.length;
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}
function validateSignature(type: string, bytes: Buffer) {
  const hex = bytes.toString("hex");
  const valid =
    type === "image/png"
      ? hex.startsWith("89504e470d0a1a0a")
      : type === "image/jpeg"
        ? hex.startsWith("ffd8ff")
        : type === "image/webp"
          ? bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP"
          : type === "image/gif"
            ? /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())
            : type === "application/pdf"
              ? bytes.subarray(0, 5).toString() === "%PDF-"
              : type === "video/mp4"
                ? bytes.subarray(4, 8).toString() === "ftyp"
                : type === "video/webm"
                  ? hex.startsWith("1a45dfa3")
                  : [
                        "application/zip",
                        "application/x-zip-compressed",
                      ].includes(type)
                    ? /^(504b0304|504b0506|504b0708)/.test(hex)
                    : true;
  if (!valid)
    throw new Error("The uploaded file does not match its file type.");
}
export async function completeUpload(user: any, body: any) {
  const id = validateText(body.id, 100);
  const existing = await get("media", id);
  if (existing) {
    if (existing.userId !== user.id)
      throw new Error("This upload belongs to another account.");
    return { id, url: `/api/media/${id}` };
  }
  const pending = await get("media-upload", id);
  if (!pending || pending.userId !== user.id || pending.expires < Date.now())
    throw new Error(
      "Upload expired or unavailable. Please select the file again.",
    );
  const { data, error } = await database()
    .storage.from(MEDIA_BUCKET)
    .info(pending.storagePath);
  if (error) storageError(error);
  const actualSize = data?.size;
  if (
    typeof actualSize !== "number" ||
    actualSize !== pending.size ||
    actualSize < 1 ||
    actualSize > MAX_MEDIA_BYTES
  )
    throw new Error(
      "The uploaded file size does not match. Please select the file again.",
    );
  if (data?.contentType !== pending.type)
    throw new Error("The uploaded file type does not match.");
  validateSignature(pending.type, await prefix(pending.storagePath));
  await put("media", {
    id,
    userId: user.id,
    name: pending.name,
    type: pending.type,
    size: actualSize,
    private: pending.private,
    storagePath: pending.storagePath,
  });
  await del("media-upload", id);
  return { id, url: `/api/media/${id}` };
}
export async function signedMediaUrl(
  file: any,
  download = false,
): Promise<string> {
  const { data, error } = await database()
    .storage.from(MEDIA_BUCKET)
    .createSignedUrl(
      file.storagePath,
      60,
      download
        ? {
            download: String(file.name || "download").replace(
              /[^a-zA-Z0-9._-]/g,
              "_",
            ),
          }
        : undefined,
    );
  if (error) storageError(error);
  return data!.signedUrl;
}
