// Hosting failures can return empty bodies or HTML before a route handler runs.
export async function readApiResponse(res: Response): Promise<any> {
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
