import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { repasEstPasse } from "@/lib/dates";
import { getDb } from "@/lib/db";
import {
  absences,
  centres,
  commandes,
  effectifs,
  grammages,
  ingredients,
  lignesCommande,
  mouvements,
  plats,
  produitsStock,
  repas,
  sejours,
} from "@/lib/db/schema";
import { comptesVides, type Comptes } from "@/lib/effectifs";
import { estService, indexService, type ServiceId } from "@/lib/services";

export async function listerCentres() {
  const db = await getDb();
  return db.select().from(centres).orderBy(asc(centres.nom));
}

export async function trouverCentre(slug: string) {
  const db = await getDb();
  const [centre] = await db.select().from(centres).where(eq(centres.slug, slug));
  return centre ?? null;
}

export async function resoudreCentre(params: Promise<{ centre: string }>) {
  const { centre: slug } = await params;
  const centre = await trouverCentre(slug);
  if (!centre) notFound();
  return centre;
}

export async function sejourDuCentre(centreId: string) {
  const db = await getDb();
  const [sejour] = await db.select().from(sejours).where(eq(sejours.centreId, centreId));
  return sejour ?? null;
}

export async function repasDuSejour(sejourId: string) {
  const db = await getDb();
  const liste = await db.select().from(repas).where(eq(repas.sejourId, sejourId));
  return liste.sort((a, b) => a.date.localeCompare(b.date) || indexService(a.service) - indexService(b.service));
}

export async function repasParId(id: string) {
  const db = await getDb();
  const [ligne] = await db.select().from(repas).where(eq(repas.id, id));
  return ligne ?? null;
}

export async function comptesEffectifs(sejourId: string) {
  const db = await getDb();
  const lignes = await db.select().from(effectifs).where(eq(effectifs.sejourId, sejourId));
  const comptes = comptesVides();
  for (const ligne of lignes) comptes[ligne.tranche] = ligne.nombre;
  return comptes;
}

export async function absencesDesRepas(repasIds: string[]) {
  const resultat: Record<string, Comptes> = {};
  if (repasIds.length === 0) return resultat;
  const db = await getDb();
  const lignes = await db.select().from(absences).where(inArray(absences.repasId, repasIds));
  for (const id of repasIds) resultat[id] = {};
  for (const ligne of lignes) {
    const compte = resultat[ligne.repasId] ?? {};
    compte[ligne.tranche] = ligne.nombre;
    resultat[ligne.repasId] = compte;
  }
  return resultat;
}

export async function grammagesDuCentre(centreId: string) {
  const db = await getDb();
  return db.select().from(grammages).where(eq(grammages.centreId, centreId)).orderBy(asc(grammages.libelle));
}

export async function platsDesRepas(repasIds: string[]) {
  if (repasIds.length === 0) return [];
  const db = await getDb();
  return db.select().from(plats).where(inArray(plats.repasId, repasIds)).orderBy(asc(plats.ordre));
}

export async function ingredientsDesPlats(platIds: string[]) {
  if (platIds.length === 0) return [];
  const db = await getDb();
  return db.select().from(ingredients).where(inArray(ingredients.platId, platIds));
}

export async function produitsDuCentre(centreId: string) {
  const db = await getDb();
  return db.select().from(produitsStock).where(eq(produitsStock.centreId, centreId)).orderBy(asc(produitsStock.nom));
}

export async function mouvementsDuCentre(centreId: string) {
  const db = await getDb();
  const produits = await produitsDuCentre(centreId);
  if (produits.length === 0) return [];
  return db.select().from(mouvements).where(inArray(mouvements.produitId, produits.map((produit) => produit.id)));
}

export async function commandesDuCentre(centreId: string) {
  const db = await getDb();
  const liste = await db.select().from(commandes).where(eq(commandes.centreId, centreId)).orderBy(desc(commandes.creeLe));
  if (liste.length === 0) return [];
  const lignes = await db.select().from(lignesCommande).where(inArray(lignesCommande.commandeId, liste.map((commande) => commande.id)));
  return liste.map((commande) => ({
    ...commande,
    lignes: lignes.filter((ligne) => ligne.commandeId === commande.id),
  }));
}

export async function repasAConfirmer(centreId: string, maintenant = new Date()) {
  const sejour = await sejourDuCentre(centreId);
  if (!sejour) return [];
  const liste = await repasDuSejour(sejour.id);
  return liste.filter((item) => {
    if (item.confirmeLe || !estService(item.service)) return false;
    return repasEstPasse(item.date, item.service as ServiceId, maintenant);
  });
}

export async function contenuRepas(repasId: string) {
  const db = await getDb();
  const platsLignes = await db.select().from(plats).where(eq(plats.repasId, repasId)).orderBy(asc(plats.ordre));
  const ingredientsLignes =
    platsLignes.length === 0
      ? []
      : await db.select().from(ingredients).where(inArray(ingredients.platId, platsLignes.map((plat) => plat.id)));
  return { plats: platsLignes, ingredients: ingredientsLignes };
}

export async function verifierRepasDuCentre(slug: string, repasId: string) {
  const centre = await trouverCentre(slug);
  if (!centre) notFound();
  const sejour = await sejourDuCentre(centre.id);
  const ligne = await repasParId(repasId);
  if (!sejour || !ligne || ligne.sejourId !== sejour.id) notFound();
  return { centre, sejour, repas: ligne };
}

export async function produitDuCentre(centreId: string, produitId: string) {
  const db = await getDb();
  const [produit] = await db
    .select()
    .from(produitsStock)
    .where(and(eq(produitsStock.id, produitId), eq(produitsStock.centreId, centreId)));
  return produit ?? null;
}
