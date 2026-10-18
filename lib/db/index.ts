import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { GRAMMAGES } from "@/lib/gemrcn/tables";
import * as schema from "@/lib/db/schema";
import { grammages } from "@/lib/db/schema";
import { SCHEMA_SQL } from "@/lib/db/sql";

export type Base = LibSQLDatabase<typeof schema>;

const globalPourDb = globalThis as unknown as { gestionDb?: Promise<Base> };
let client: Client | null = null;

export function getDb() {
  if (!globalPourDb.gestionDb) {
    globalPourDb.gestionDb = initialiser().catch((erreur) => {
      globalPourDb.gestionDb = undefined;
      throw erreur;
    });
  }
  return globalPourDb.gestionDb;
}

function urlBase() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const dossier = process.env.VERCEL ? "/tmp/gestionlibre" : path.join(process.cwd(), "data");
  fs.mkdirSync(dossier, { recursive: true });
  return `file:${path.join(dossier, "gestion.db")}`;
}

async function initialiser() {
  const url = urlBase();
  client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(SCHEMA_SQL);
  const db = drizzle(client, { schema });
  await semerCentre(db, { id: "centre-menton", slug: "menton", nom: "Menton" });
  return db;
}

export async function semerCentre(db: Base, centre: { id: string; slug: string; nom: string }) {
  await db
    .insert(schema.centres)
    .values(centre)
    .onConflictDoNothing();
  const existants = await db
    .select({ cle: grammages.cle, serviceGroupe: grammages.serviceGroupe })
    .from(grammages)
    .where(eq(grammages.centreId, centre.id));
  const deja = new Set(existants.map((ligne) => `${ligne.serviceGroupe}:${ligne.cle}`));
  const manquants = GRAMMAGES.filter((ligne) => !deja.has(`${ligne.serviceGroupe}:${ligne.cle}`));
  if (manquants.length === 0) return;
  await db.insert(grammages).values(
    manquants.map((ligne) => ({
      id: `${centre.id}:${ligne.serviceGroupe}:${ligne.cle}`,
      centreId: centre.id,
      cle: ligne.cle,
      serviceGroupe: ligne.serviceGroupe,
      libelle: ligne.libelle,
      unite: ligne.unite,
      note: ligne.note,
      baseEnfant: ligne.baseEnfant,
      baseAdo: ligne.baseAdo,
      baseAdulte: ligne.baseAdulte,
      retenuEnfant: ligne.baseEnfant,
      retenuAdo: ligne.baseAdo,
      retenuAdulte: ligne.baseAdulte,
    })),
  );
}
