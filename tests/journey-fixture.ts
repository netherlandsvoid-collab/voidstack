// Run the existing journeys against actual Next.js route handlers and an isolated
// Supabase HTTP fixture. No listening port and no production data are involved.
import { installSupabaseFixture } from "./supabase-fixture";
import { GET, POST } from "../src/app/api/[...path]/route";
import { GET as media } from "../src/app/api/media/[id]/route";
const fixture = installSupabaseFixture();
const supabaseFetch = globalThis.fetch;
process.env.TEST_URL = "http://journey.test";
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init);
  const url = new URL(req.url);
  if (url.origin !== process.env.TEST_URL) return supabaseFetch(input, init);
  const path = url.pathname.replace(/^\/api\//, "").split("/");
  if (path[0] === "media")
    return media(req, { params: Promise.resolve({ id: path[1] }) });
  return (req.method === "POST" ? POST : GET)(req, {
    params: Promise.resolve({ path }),
  });
};
