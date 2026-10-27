import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(
  `${process.env.DATA_DIR || ".data"}/nexirel.sqlite`,
);
const records = db.prepare("SELECT kind,id,data FROM records").all();
const ids = new Set(
  records
    .filter(
      (r) =>
        r.kind === "user" &&
        /^Test (Seller|Buyer|Stranger)$/.test(JSON.parse(r.data).name),
    )
    .map((r) => r.id),
);
for (const r of records) {
  const d = JSON.parse(r.data);
  if (
    ids.has(r.id) ||
    ["userId", "from", "to", "actorId"].some((k) => ids.has(d[k]))
  ) {
    db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(r.kind, r.id);
  }
}
console.log("Removed only automated journey-test records.");
