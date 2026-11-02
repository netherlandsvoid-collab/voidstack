import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chronological,
  conversationMessages,
  conversationList,
  type ChatMessage,
} from "../src/lib/conversations";
const messages: ChatMessage[] = [
  {
    id: "a",
    from: "me",
    to: "alice",
    text: "Newest",
    read: false,
    createdAt: 300,
  },
  {
    id: "m",
    from: "bob",
    to: "me",
    text: "Other chat",
    read: false,
    createdAt: 200,
  },
  {
    id: "z",
    from: "alice",
    to: "me",
    text: "Oldest",
    read: false,
    createdAt: 100,
  },
  { id: "private", from: "bob", to: "alice", read: false, createdAt: 400 },
];
test("timeline uses timestamps, excludes other conversations, and never mutates state", () => {
  const original = structuredClone(messages);
  assert.deepEqual(
    conversationMessages(messages, "me", "alice").map((m) => m.id),
    ["z", "a"],
  );
  assert.deepEqual(messages, original);
  assert.deepEqual(
    chronological([{ ...messages[0], id: "b" }, messages[0]]).map((m) => m.id),
    ["a", "b"],
  );
});
test("inbox shows latest preview and recent conversation first, counts only incoming unread", () => {
  const people = ["me", "alice", "bob", "new"].map((id) => ({ id, name: id }));
  const rows = conversationList(messages, people, "me", "new");
  assert.deepEqual(
    rows.map((r) => r.person.id),
    ["alice", "bob", "new"],
  );
  assert.equal(rows[0].last?.text, "Newest");
  assert.equal(rows[0].unread, 1);
  assert.equal(rows[2].last, undefined);
  assert.equal(conversationList(messages, people, "me").length, 2);
});
