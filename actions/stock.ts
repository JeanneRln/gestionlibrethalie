"use server";

import { and, eq } from "drizzle-orm";
import { aujourdhuiParis } from "@/lib/dates";
import {
  contenuRepas,
  grammagesDuCentre,
  mouvementsDuCentre,
  produitDuCentre,
  produitsDuCentre,
  trouverCentre,
  verifierRepasDuCentre,
} from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { ingredients, mouvements, produitsStock, repas } from "@/lib/db/schema";
import { arrondir, lireNombre } from "@/lib/format";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { estService } from "@/lib/services";
import { normaliserNom, normaliserUnite, uniteCompatible, versBase } from "@/lib/unites";
import { stockReel } from "@/lib/projection";

export async function ajouterProduit(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "stock");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const nom = String(formData.get("nom") ?? "").trim();
  const quantite = lireNombre(formData.get("quantite"));
  const unite = normaliserUnite(String(formData.get("unite") ?? "kg"));
  if (!nom) rediriger(chemin, "erreur", "Indiquez le nom du produit.");
  if (quantite === null || quantite < 0) rediriger(chemin, "erreur", "Indiquez une quantité positive.");
  const base = versBase(quantite, unite);
  if (!base) rediriger(chemin, "erreur", "Choisissez une unité : kg, g, L, ml ou pièce.");
  const db = await getDb();
  const nomNormalise = normaliserNom(nom);
  const existants = await db.select().from(produitsStock).where(eq(produitsStock.centreId, centre.id));
  const deja = existants.find((produit) => produit.nomNormalise === nomNormalise);
  if (deja && deja.uniteBase !== base.uniteBase) {
    rediriger(chemin, "erreur", "Ce produit existe déjà dans une autre unité.");
  }
  const produitId = deja?.id ?? crypto.randomUUID();
  if (!deja) {
    await db.insert(produitsStock).values({
      id: produitId,
      centreId: centre.id,
      nom,
      nomNormalise,
      uniteBase: base.uniteBase,
    });
  }
  if (base.quantite > 0) {
    await db.insert(mouvements).values({
      id: crypto.randomUUID(),
      produitId,
      type: "ajustement",
      quantite: arrondir(base.quantite),
      date: aujourdhuiParis(),
      repasId: null,
      ligneCommandeId: null,
      ingredientId: null,
    });
  }
  rediriger(chemin, "message", deja ? `${nom} est complété.` : `${nom} est ajouté au stock.`);
}

export async function ajusterStock(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const produitId = String(formData.get("produitId") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "stock");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const produit = await produitDuCentre(centre.id, produitId);
  if (!produit) rediriger(chemin, "erreur", "Produit introuvable.");
  const saisie = lireNombre(formData.get("quantite"));
  if (saisie === null || saisie < 0) rediriger(chemin, "erreur", "Indiquez la quantité réelle.");
  const facteur = produit.uniteBase === "piece" ? 1 : 1000;
  const cible = saisie * facteur;
  const mouvementsListe = await mouvementsDuCentre(centre.id);
  const actuel = stockReel(
    mouvementsListe.map((mouvement) => ({ ...mouvement, ingredientId: mouvement.ingredientId })),
    produit.id,
  );
  const delta = arrondir(cible - actuel);
  if (delta !== 0) {
    const db = await getDb();
    await db.insert(mouvements).values({
      id: crypto.randomUUID(),
      produitId: produit.id,
      type: "ajustement",
      quantite: delta,
      date: aujourdhuiParis(),
      repasId: null,
      ligneCommandeId: null,
      ingredientId: null,
    });
  }
  rediriger(chemin, "message", `Stock de ${produit.nom} mis au réel.`);
}

export async function confirmerRepas(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const repasId = String(formData.get("repasId") ?? "");
  const { centre, repas: ligne } = await verifierRepasDuCentre(slug, repasId);
  const chemin = cheminCentre(slug, `stock/${ligne.id}`);
  if (!estService(ligne.service)) rediriger(chemin, "erreur", "Repas illisible.");
  const { ingredients: ingredientsLignes } = await contenuRepas(ligne.id);
  const [grammageLignes, produits] = await Promise.all([
    grammagesDuCentre(centre.id),
    produitsDuCentre(centre.id),
  ]);
  const sorties: { ingredientId: string; produitId: string; quantiteBase: number; quantiteSaisie: number }[] = [];

  for (const ingredient of ingredientsLignes) {
    const saisie = lireNombre(formData.get(`q_${ingredient.id}`));
    if (saisie === null || saisie < 0) rediriger(chemin, "erreur", `Indiquez la quantité de ${ingredient.nom}.`);
    const produitId = String(formData.get(`p_${ingredient.id}`) ?? "");
    if (saisie === 0) {
      sorties.push({ ingredientId: ingredient.id, produitId: "", quantiteBase: 0, quantiteSaisie: 0 });
      continue;
    }
    const produit = produits.find((item) => item.id === produitId);
    if (!produit) rediriger(chemin, "erreur", `Rattachez ${ingredient.nom} à un produit du stock.`);
    const famille = grammageLignes.find((item) => item.cle === ingredient.grammageCle);
    const unite = famille?.unite ?? "g";
    if (!uniteCompatible(unite, produit.uniteBase)) {
      rediriger(chemin, "erreur", `${ingredient.nom} et ${produit.nom} n'ont pas la même unité.`);
    }
    const base = versBase(saisie, unite);
    if (!base) rediriger(chemin, "erreur", `Unité illisible pour ${ingredient.nom}.`);
    sorties.push({
      ingredientId: ingredient.id,
      produitId: produit.id,
      quantiteBase: arrondir(base.quantite),
      quantiteSaisie: arrondir(saisie),
    });
  }

  const db = await getDb();
  await db.delete(mouvements).where(and(eq(mouvements.repasId, ligne.id), eq(mouvements.type, "repas")));
  for (const sortie of sorties) {
    await db
      .update(ingredients)
      .set({
        produitStockId: sortie.produitId || null,
        quantiteConfirmee: sortie.quantiteSaisie,
      })
      .where(eq(ingredients.id, sortie.ingredientId));
    if (sortie.produitId && sortie.quantiteBase > 0) {
      await db.insert(mouvements).values({
        id: crypto.randomUUID(),
        produitId: sortie.produitId,
        type: "repas",
        quantite: -sortie.quantiteBase,
        date: ligne.date,
        repasId: ligne.id,
        ligneCommandeId: null,
        ingredientId: sortie.ingredientId,
      });
    }
  }
  await db.update(repas).set({ confirmeLe: new Date().toISOString() }).where(eq(repas.id, ligne.id));
  rediriger(cheminCentre(slug, "stock"), "message", "Quantités du repas enregistrées. Le stock est à jour.");
}
