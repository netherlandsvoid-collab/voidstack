// Hosting failures can return empty bodies or HTML before a route handler runs.
export async function readApiResponse(res: Response): Promise<any> {
  if (res.status === 413) {
    throw new Error(
      "The file is too large for this upload request. Refresh the page and select a smaller file.",
    );
  }
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${res.status}). Please try again later.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `The request failed (HTTP ${res.status}). Please try again later.`,
    );
  }
  return data;
}
