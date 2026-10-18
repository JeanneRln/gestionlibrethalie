import { eq } from "drizzle-orm";
import type { Base } from "./connection";
import { GRAMMAGES } from "../gemrcn/tables";
import * as schema from "./schema";
import { grammages } from "./schema";

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
  ).onConflictDoNothing();
}
