"use server";

import { eq } from "drizzle-orm";
import { repasDuSejour, sejourDuCentre, trouverCentre, verifierRepasDuCentre } from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { ingredients, plats } from "@/lib/db/schema";
import { remettreAConfirmer, viderRepas } from "@/lib/ecritures";
import { CLES_GRAMMAGE } from "@/lib/gemrcn/tables";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { extraireMenu } from "@/lib/openai";
import { estTypePlat } from "@/lib/services";

const TAILLE_MAX = 12 * 1024 * 1024;

export async function importerMenu(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "menus");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const sejour = await sejourDuCentre(centre.id);
  if (!sejour) rediriger(chemin, "erreur", "Créez d'abord le séjour.");
  const fichier = await lireFichier(formData, chemin);
  const creneaux = await repasDuSejour(sejour.id);

  let extrait;
  try {
    extrait = await extraireMenu(fichier, creneaux.map((item) => ({ date: item.date, service: item.service })));
  } catch (erreur) {
    rediriger(chemin, "erreur", erreur instanceof Error ? erreur.message : "L'import du menu a échoué.");
  }

  const db = await getDb();
  let remplis = 0;
  for (const bloc of extrait.repas) {
    if (bloc.plats.length === 0) continue;
    const cible = creneaux.find((item) => item.date === bloc.date && item.service === bloc.service);
    if (!cible) continue;
    await viderRepas(db, cible.id);
    for (const [index, plat] of bloc.plats.entries()) {
      const platId = crypto.randomUUID();
      await db.insert(plats).values({
        id: platId,
        repasId: cible.id,
        nom: plat.nom,
        type: plat.type,
        ordre: index,
      });
      if (plat.ingredients.length > 0) {
        await db.insert(ingredients).values(
          plat.ingredients.map((ingredient) => ({
            id: crypto.randomUUID(),
            platId,
            nom: ingredient.nom,
            grammageCle: ingredient.grammageCle,
            produitStockId: null,
            quantiteConfirmee: null,
          })),
        );
      }
    }
    remplis += 1;
  }
  rediriger(
    chemin,
    remplis > 0 ? "message" : "erreur",
    remplis > 0 ? `${remplis} repas ont été remplis depuis le fichier.` : "Aucun plat reconnu sur les dates du séjour.",
  );
}

export async function ajouterPlat(formData: FormData) {
  const { chemin, repasId } = await contexteRepas(formData);
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "autre");
  if (!nom) rediriger(chemin, "erreur", "Indiquez le nom du plat.");
  const db = await getDb();
  const existants = await db.select().from(plats).where(eq(plats.repasId, repasId));
  await db.insert(plats).values({
    id: crypto.randomUUID(),
    repasId,
    nom,
    type: estTypePlat(type) ? type : "autre",
    ordre: existants.length,
  });
  await remettreAConfirmer(db, repasId);
  rediriger(chemin, "message", "Plat ajouté.");
}

export async function supprimerPlat(formData: FormData) {
  const { chemin, repasId } = await contexteRepas(formData);
  const platId = String(formData.get("platId") ?? "");
  const db = await getDb();
  const [plat] = await db.select().from(plats).where(eq(plats.id, platId));
  if (!plat || plat.repasId !== repasId) rediriger(chemin, "erreur", "Plat introuvable.");
  await db.delete(ingredients).where(eq(ingredients.platId, platId));
  await db.delete(plats).where(eq(plats.id, platId));
  await remettreAConfirmer(db, repasId);
  rediriger(chemin, "message", "Plat retiré.");
}

export async function ajouterIngredient(formData: FormData) {
  const { chemin, repasId } = await contexteRepas(formData);
  const platId = String(formData.get("platId") ?? "");
  const nom = String(formData.get("nom") ?? "").trim();
  const cle = String(formData.get("grammageCle") ?? "");
  if (!nom) rediriger(chemin, "erreur", "Indiquez l'ingrédient.");
  if (!CLES_GRAMMAGE.includes(cle)) rediriger(chemin, "erreur", "Choisissez une famille de grammage.");
  const db = await getDb();
  const [plat] = await db.select().from(plats).where(eq(plats.id, platId));
  if (!plat || plat.repasId !== repasId) rediriger(chemin, "erreur", "Plat introuvable.");
  await db.insert(ingredients).values({
    id: crypto.randomUUID(),
    platId,
    nom,
    grammageCle: cle,
    produitStockId: null,
    quantiteConfirmee: null,
  });
  await remettreAConfirmer(db, repasId);
  rediriger(chemin, "message", "Ingrédient ajouté.");
}

export async function changerFamille(formData: FormData) {
  const { chemin, repasId } = await contexteRepas(formData);
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const cle = String(formData.get("grammageCle") ?? "");
  if (!CLES_GRAMMAGE.includes(cle)) rediriger(chemin, "erreur", "Choisissez une famille de grammage.");
  const db = await getDb();
  const ingredient = await ingredientDuRepas(db, ingredientId, repasId);
  if (!ingredient) rediriger(chemin, "erreur", "Ingrédient introuvable.");
  await db.update(ingredients).set({ grammageCle: cle, quantiteConfirmee: null }).where(eq(ingredients.id, ingredientId));
  await remettreAConfirmer(db, repasId);
  rediriger(chemin, "message", "Famille de grammage mise à jour.");
}

export async function supprimerIngredient(formData: FormData) {
  const { chemin, repasId } = await contexteRepas(formData);
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const db = await getDb();
  const ingredient = await ingredientDuRepas(db, ingredientId, repasId);
  if (!ingredient) rediriger(chemin, "erreur", "Ingrédient introuvable.");
  await db.delete(ingredients).where(eq(ingredients.id, ingredientId));
  await remettreAConfirmer(db, repasId);
  rediriger(chemin, "message", "Ingrédient retiré.");
}

async function contexteRepas(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const repasId = String(formData.get("repasId") ?? "");
  const { repas: ligne } = await verifierRepasDuCentre(slug, repasId);
  return { chemin: cheminCentre(slug, `menus/${ligne.id}`), repasId: ligne.id, slug };
}

async function ingredientDuRepas(db: Awaited<ReturnType<typeof getDb>>, ingredientId: string, repasId: string) {
  const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, ingredientId));
  if (!ingredient) return null;
  const [plat] = await db.select().from(plats).where(eq(plats.id, ingredient.platId));
  if (!plat || plat.repasId !== repasId) return null;
  return ingredient;
}

async function lireFichier(formData: FormData, chemin: string) {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    rediriger(chemin, "erreur", "Choisissez un PDF ou une image.");
  }
  if (fichier.size > TAILLE_MAX) rediriger(chemin, "erreur", "Le fichier dépasse 12 Mo.");
  const type = fichier.type || "application/octet-stream";
  if (type !== "application/pdf" && !type.startsWith("image/")) {
    rediriger(chemin, "erreur", "Le fichier doit être un PDF ou une image.");
  }
  const base64 = Buffer.from(await fichier.arrayBuffer()).toString("base64");
  return { nom: fichier.name || "menu", mediaType: type, base64 };
}
