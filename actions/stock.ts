"use server";

import { and, eq, inArray } from "drizzle-orm";
import { aujourdhuiParis } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  contenuRepas,
  grammagesDuCentre,
  ingredientsDesPlats,
  mouvementsDuCentre,
  platsDesRepas,
  produitDuCentre,
  produitsDuCentre,
  repasDuSejour,
  sejourDuCentre,
  trouverCentre,
  verifierRepasDuCentre,
} from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { ingredients, mouvements, produitsStock, repas } from "@/lib/db/schema";
import { arrondir, lireNombre } from "@/lib/format";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { assemblerLignes, grouperConsommes, jetons, lireMoment, portionUnitaire, repasDuMoment, repartir, saisieRegulation, type LignePoint } from "@/lib/pointStock";
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
    if (portionUnitaire(produit.nom, produit.uniteBase) || jetons(ingredient.nom).includes("chips")) {
      sorties.push({
        ingredientId: ingredient.id,
        produitId: produit.id,
        quantiteBase: arrondir(saisie),
        quantiteSaisie: arrondir(saisie),
      });
      continue;
    }
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

export async function confirmerAvant(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const momentTexte = String(formData.get("moment") ?? "");
  const chemin = `${cheminCentre(slug || "menton", "stock")}?moment=${encodeURIComponent(momentTexte)}`;
  const centre = await trouverCentre(slug);
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const moment = lireMoment(momentTexte);
  if (!moment) rediriger(cheminCentre(slug, "stock"), "erreur", "Choisissez d'abord l'heure du point.");

  const sejour = await sejourDuCentre(centre.id);
  if (!sejour) rediriger(cheminCentre(slug, "stock"), "erreur", "Créez d'abord le séjour.");
  const liste = await repasDuSejour(sejour.id);
  if (!liste.some((item) => item.id === moment.repasId)) {
    rediriger(cheminCentre(slug, "stock"), "erreur", "Ce repas est introuvable.");
  }
  const cibles = repasDuMoment(liste, moment);
  if (cibles.length === 0) {
    rediriger(chemin, "message", "Aucun repas à compter pour ce moment.");
  }

  const plats = await platsDesRepas(cibles.map((item) => item.id));
  const ingredientsLignes = await ingredientsDesPlats(plats.map((plat) => plat.id));
  const grammages = await grammagesDuCentre(centre.id);
  const produits = await produitsDuCentre(centre.id);
  const groupes = grouperConsommes(
    assemblerLignes({
      repas: cibles,
      plats,
      ingredients: ingredientsLignes,
      grammages: grammages.map(portion),
      inscrits: await comptesEffectifs(sejour.id),
      absences: await absencesDesRepas(cibles.map((item) => item.id)),
      produits,
    }),
    produits,
  );

  const reglables = groupes.flatMap((groupe) => {
    const produit = produits.find((item) => item.id === groupe.produitStockId);
    return produit ? [{ groupe, produit }] : [];
  });
  const sorties: { ingredient: LignePoint; produitId: string; saisie: number; base: number }[] = [];
  for (const [index, ligne] of reglables.entries()) {
    const { groupe, produit } = ligne;
    const ids = String(formData.get(`ids_${index}`) ?? "");
    const attendu = groupe.lignes.map((item) => item.ingredientId).join(",");
    if (ids !== attendu) rediriger(chemin, "erreur", "La liste a changé. Rouvrez la mise à jour.");
    const saisieUnite = saisieRegulation(groupe.unite, groupe.theorique, produit.uniteBase, produit.nom);
    const quantite = lireNombre(formData.get(`q_${index}`));
    if (quantite === null || quantite < 0) rediriger(chemin, "erreur", `Indiquez la quantité de ${groupe.titre}.`);
    const converti = quantite === 0 ? { quantite: 0 } : versBase(quantite, saisieUnite.unite);
    if (!converti) rediriger(chemin, "erreur", `Unité illisible pour ${groupe.titre}.`);
    const parts = quantite === 0 ? groupe.lignes.map(() => 0) : repartir(converti.quantite, groupe.lignes.map((item) => item.theorique));
    groupe.lignes.forEach((item, position) => {
      const part = arrondir(parts[position] ?? 0);
      sorties.push({
        ingredient: item,
        produitId: part > 0 ? produit.id : "",
        saisie: part,
        base: part,
      });
    });
  }

  const db = await getDb();
  const repasIds = cibles.map((item) => item.id);
  await db.delete(mouvements).where(and(inArray(mouvements.repasId, repasIds), eq(mouvements.type, "repas")));
  for (const sortie of sorties) {
    const identifiant = sortie.ingredient.ingredientId;
    let ingredientId: string | null = identifiant;
    if (identifiant.startsWith("plat:")) {
      ingredientId = crypto.randomUUID();
      await db.insert(ingredients).values({
        id: ingredientId,
        platId: sortie.ingredient.platId,
        nom: sortie.ingredient.nom,
        grammageCle: sortie.ingredient.grammageCle,
        produitStockId: sortie.produitId || null,
        quantiteConfirmee: sortie.saisie,
      });
    } else if (identifiant.startsWith("boisson:")) {
      ingredientId = null;
    } else {
      await db
        .update(ingredients)
        .set({
          produitStockId: sortie.produitId || null,
          quantiteConfirmee: sortie.saisie,
        })
        .where(eq(ingredients.id, identifiant));
    }
    if (sortie.produitId && sortie.base > 0) {
      await db.insert(mouvements).values({
        id: crypto.randomUUID(),
        produitId: sortie.produitId,
        type: "repas",
        quantite: -sortie.base,
        date: cibles.find((item) => item.id === sortie.ingredient.repasId)?.date ?? "",
        repasId: sortie.ingredient.repasId,
        ligneCommandeId: null,
        ingredientId,
      });
    }
  }
  await db.update(repas).set({ confirmeLe: new Date().toISOString() }).where(inArray(repas.id, repasIds));
  rediriger(
    cheminCentre(slug, "stock"),
    "message",
    cibles.length > 1 ? `${cibles.length} repas sont régularisés.` : "Le repas est régularisé.",
  );
}


function portion(ligne: { cle: string; serviceGroupe: string; unite: string; retenuEnfant: number; retenuAdo: number; retenuAdulte: number }) {
  return {
    cle: ligne.cle,
    serviceGroupe: ligne.serviceGroupe as "repas_principal" | "petit_dej_gouter" | "diner_enfant",
    unite: ligne.unite,
    retenuEnfant: ligne.retenuEnfant,
    retenuAdo: ligne.retenuAdo,
    retenuAdulte: ligne.retenuAdulte,
  };
}
