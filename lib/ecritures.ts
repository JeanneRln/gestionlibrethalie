import { and, eq } from "drizzle-orm";
import type { Base } from "@/lib/db";
import { absences, ingredients, mouvements, plats, repas } from "@/lib/db/schema";

export async function viderRepas(db: Base, repasId: string) {
  const platsLignes = await db.select().from(plats).where(eq(plats.repasId, repasId));
  for (const plat of platsLignes) {
    await db.delete(ingredients).where(eq(ingredients.platId, plat.id));
  }
  if (platsLignes.length > 0) {
    await db.delete(plats).where(eq(plats.repasId, repasId));
  }
  await db.delete(mouvements).where(and(eq(mouvements.repasId, repasId), eq(mouvements.type, "repas")));
  await db.update(repas).set({ confirmeLe: null }).where(eq(repas.id, repasId));
}

export async function effacerRepas(db: Base, repasId: string) {
  await viderRepas(db, repasId);
  await db.delete(absences).where(eq(absences.repasId, repasId));
  await db.delete(repas).where(eq(repas.id, repasId));
}

export async function remettreAConfirmer(db: Base, repasId: string) {
  await db.delete(mouvements).where(and(eq(mouvements.repasId, repasId), eq(mouvements.type, "repas")));
  await db.update(repas).set({ confirmeLe: null }).where(eq(repas.id, repasId));
}
