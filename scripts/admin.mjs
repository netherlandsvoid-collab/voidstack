import { DatabaseSync } from "node:sqlite";
const username = process.argv[2];
if (!username) {
  console.error("Usage: node scripts/admin.mjs <existing-username>");
  process.exit(1);
}
const db = new DatabaseSync(
  `${process.env.DATA_DIR || ".data"}/nexirel.sqlite`,
);
const row = db
  .prepare("SELECT id,data FROM records WHERE kind='user'")
  .all()
  .find((r) => JSON.parse(r.data).username === username);
if (!row) throw new Error("User not found. Register the account first.");
const user = JSON.parse(row.data);
if (user.seed) throw new Error("Sample users cannot become administrators.");
db.prepare("UPDATE records SET data=? WHERE kind='user' AND id=?").run(
  JSON.stringify({ ...user, role: "admin" }),
  row.id,
);
console.log("Administrator role granted to the specified existing account.");
