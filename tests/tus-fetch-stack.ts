// Isolated transport for exercising the real TUS client's POST/HEAD/PATCH logic.
// Production uses the library's native browser XHR stack.
import type { HttpStack, HttpRequest } from "tus-js-client";
export const tusFetchStack: HttpStack = {
  getName: () => "isolated-fetch",
  createRequest(method, url): HttpRequest {
    const headers = new Headers();
    const controller = new AbortController();
    return {
      getMethod: () => method,
      getURL: () => url,
      setHeader: (k, v) => headers.set(k, v),
      getHeader: (k) => headers.get(k) || undefined,
      setProgressHandler() {},
      send: async (body) => {
        const res = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        const text = await res.text();
        return {
          getStatus: () => res.status,
          getHeader: (k) => res.headers.get(k) || undefined,
          getBody: () => text,
          getUnderlyingObject: () => res,
        };
      },
      abort: async () => controller.abort(),
      getUnderlyingObject: () => null,
    };
  },
};
