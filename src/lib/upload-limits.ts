export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_PRODUCT_MAX_BYTES = 50 * 1024 * 1024;
export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3)
    return `${(bytes / 1024 ** 3).toFixed(1).replace(/\.0$/, "")} GB`;
  if (bytes >= 1024 ** 2)
    return `${(bytes / 1024 ** 2).toFixed(1).replace(/\.0$/, "")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
export const knownTypes = new Set([
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
]);
export function uploadContentType(file: { type: string }, product: boolean) {
  const type = file.type || "application/octet-stream";
  return product && !knownTypes.has(type) ? "application/octet-stream" : type;
}
