import { events } from "@/lib/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  let clean = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = () => {
        if (!closed)
          try {
            controller.enqueue(enc.encode("data: refresh\n\n"));
          } catch {
            clean();
          }
      };
      const heartbeat = setInterval(() => {
        if (!closed)
          try {
            controller.enqueue(enc.encode(": keepalive\n\n"));
          } catch {
            clean();
          }
      }, 20000);
      let pending: ReturnType<typeof setTimeout> | undefined;
      const change = () => {
        if (!pending)
          pending = setTimeout(() => {
            pending = undefined;
            send();
          }, 100);
      };
      events.on("change", change);
      clean = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(pending);
        events.off("change", change);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", clean, { once: true });
      controller.enqueue(enc.encode(": connected\n\n"));
    },
    cancel() {
      clean();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
