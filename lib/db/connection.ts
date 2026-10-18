import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Base = NodePgDatabase<typeof schema>;

export function creerConnexion(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL manquante : configurez la connexion PostgreSQL Supabase dans .env.local.");
  }
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL doit être une URL PostgreSQL valide.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL doit utiliser PostgreSQL.");
  }
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  pool.on("error", () => console.error("Connexion PostgreSQL inactive interrompue."));
  // No named prepared statements: compatible with transaction pooling.
  return { db: drizzle(pool, { schema }), pool };
}
