import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { creerConnexion } from "../lib/db/connection";
import { semerCentre } from "../lib/db/seed";

loadEnvConfig(process.cwd());

async function main() {
  const command = process.argv[2];
  if (command !== "migrate" && command !== "seed") {
    throw new Error("Commande attendue : migrate ou seed.");
  }
  const { db, pool } = creerConnexion(process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL);
  try {
    if (command === "seed") {
      await db.transaction(async (tx) => {
        await semerCentre(tx, { id: "centre-menton", slug: "menton", nom: "Menton" });
      });
      console.log("Menton et grammages initialisés (valeurs existantes conservées).");
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(18002026)");
      await client.query("CREATE SCHEMA IF NOT EXISTS gestion_migrations");
      await client.query("REVOKE ALL ON SCHEMA gestion_migrations FROM PUBLIC, anon, authenticated");
      await client.query(`CREATE TABLE IF NOT EXISTS gestion_migrations.applied (
        name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
      )`);
      const folder = path.join(process.cwd(), "supabase/migrations");
      for (const name of (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort()) {
        const sql = await readFile(path.join(folder, name), "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const previous = await client.query("SELECT checksum FROM gestion_migrations.applied WHERE name = $1", [name]);
        if (previous.rowCount) {
          if (previous.rows[0].checksum !== checksum) throw new Error(`Migration déjà appliquée mais modifiée : ${name}`);
          continue;
        }
        await client.query(sql);
        await client.query("INSERT INTO gestion_migrations.applied (name, checksum) VALUES ($1, $2)", [name, checksum]);
      }
      await client.query("COMMIT");
      console.log("Migrations appliquées.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erreur inconnue";
  console.error(message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[connexion masquée]"));
  process.exitCode = 1;
});
