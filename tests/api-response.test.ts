import { test } from "node:test";
import assert from "node:assert/strict";
import { readApiResponse } from "../src/lib/api-response";

test("signup response returns the user on success", async () => {
  const data = { user: { id: "new-user" } };
  assert.deepEqual(await readApiResponse(Response.json(data)), data);
});

test("signup validation retains the API error message", async () => {
  await assert.rejects(
    readApiResponse(
      Response.json(
        { error: "An account with that email already exists." },
        { status: 400 },
      ),
    ),
    /An account with that email already exists\./,
  );
});

test("empty hosting 500 is a useful error instead of a JSON parsing exception", async () => {
  await assert.rejects(
    readApiResponse(new Response(null, { status: 500 })),
    /invalid response \(HTTP 500\)/,
  );
});

test("hosting HTML is never displayed to the user", async () => {
  await assert.rejects(
    readApiResponse(
      new Response("<html>private server details</html>", { status: 502 }),
    ),
    /invalid response \(HTTP 502\)/,
  );
});
