import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("Postgres migration: atomic profiles, unique usernames, and server-only data", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);`);
    const sql = readFileSync(
      new URL("../supabase/migrations/002_vercel_runtime.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql); // Safe to re-run the setup.
    await db.query(`insert into auth.users values ($1,$2)`, [
      "00000000-0000-4000-8000-000000000001",
      JSON.stringify({ username: "virel", name: "Virel", role: "admin" }),
    ]);
    const result = await db.query<any>(
      "select data from public.voidstack_records where kind='user'",
    );
    assert.equal(result.rows[0].data.username, "virel");
    assert.equal(result.rows[0].data.role, undefined); // Client metadata cannot grant privileges.
    assert.equal(result.rows[0].data.password, undefined);
    await assert.rejects(
      db.query(`insert into auth.users values ($1,$2)`, [
        "00000000-0000-4000-8000-000000000002",
        JSON.stringify({ username: "VIREL", name: "Duplicate" }),
      ]),
      /duplicate key/,
    );
    assert.equal((await db.query("select * from auth.users")).rows.length, 1);
    await assert.rejects(
      db.query(`insert into auth.users values ($1,'{}')`, [
        "00000000-0000-4000-8000-000000000003",
      ]),
      /check constraint/,
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from public.voidstack_records"),
        /permission denied/,
      );
      await assert.rejects(
        db.exec(
          "insert into public.voidstack_records values ('user','bad','{}')",
        ),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.query("delete from auth.users where id=$1", [
      "00000000-0000-4000-8000-000000000001",
    ]);
    assert.equal(
      (await db.query("select * from public.voidstack_records")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
