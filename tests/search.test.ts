import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchIndex, searchEntries } from "../src/lib/search";
const index = buildSearchIndex(
  [
    {
      id: "u",
      name: "Élise",
      username: "elise",
      bio: "Motion artist",
      email: "private@example.com",
    },
    { id: "disabled", name: "Hidden", disabled: true },
  ],
  [
    {
      id: "post",
      title: "Motion",
      caption: "Red shapes",
      tags: ["3D"],
      userId: "u",
      createdAt: 1,
      image: "/video",
    },
    {
      id: "new",
      title: "Shape study",
      caption: "Motion experiment",
      userId: "u",
      createdAt: 3,
    },
  ],
  [
    {
      id: "asset",
      title: "Motion templates",
      status: "published",
      category: "Animation",
      image: "/cover",
      userId: "u",
      createdAt: 2,
    },
    { id: "draft", title: "Secret draft", status: "draft" },
  ],
  { "/video": "video/mp4" },
);
test("search normalizes accents, usernames, hashtags and multi-word queries", () => {
  assert.equal(searchEntries(index, "  @ELISE  ", "creator")[0].id, "u");
  assert.equal(searchEntries(index, "#3D red")[0].id, "post");
  assert.equal(searchEntries(index, "red missing").length, 0);
  assert.equal(searchEntries(index, "  ").length, 0);
});
test("relevance prioritizes exact titles; date sort and type filters are independent", () => {
  assert.equal(searchEntries(index, "motion")[0].id, "post");
  assert.equal(searchEntries(index, "motion", "all", "newest")[0].id, "new");
  assert.deepEqual(
    searchEntries(index, "motion", "asset").map((e) => e.id),
    ["asset"],
  );
});
test("search excludes draft products, disabled creators and private email fields", () => {
  assert.equal(searchEntries(index, "secret").length, 0);
  assert.equal(searchEntries(index, "hidden").length, 0);
  assert.equal(searchEntries(index, "private@example.com").length, 0);
  assert.equal(index.find((e) => e.id === "asset")?.image, "/cover");
  assert.equal(index.find((e) => e.id === "post")?.video, true);
});
