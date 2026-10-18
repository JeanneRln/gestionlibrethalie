"use server";

import { and, eq } from "drizzle-orm";
import { aujourdhuiParis } from "@/lib/dates";
import { commandesDuCentre, trouverCentre } from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { commandes, lignesCommande, mouvements, produitsStock } from "@/lib/db/schema";
import { arrondir, lireNombre } from "@/lib/format";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { extraireCommande } from "@/lib/openai";
import { estFournisseur } from "@/lib/services";
import { normaliserNom, normaliserUnite, versBase } from "@/lib/unites";

const TAILLE_MAX = 12 * 1024 * 1024;
const SEUIL = 0.75;

export async function importerCommande(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "commandes");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const fournisseur = String(formData.get("fournisseur") ?? "");
  if (!estFournisseur(fournisseur)) rediriger(chemin, "erreur", "Choisissez Transgourmet ou Sysco.");
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) rediriger(chemin, "erreur", "Choisissez le PDF de la commande.");
  if (fichier.size > TAILLE_MAX) rediriger(chemin, "erreur", "Le fichier dépasse 12 Mo.");
  if (fichier.type && fichier.type !== "application/pdf" && !fichier.type.startsWith("image/")) {
    rediriger(chemin, "erreur", "Le fichier doit être un PDF ou une image.");
  }

  let extrait;
  try {
    extrait = await extraireCommande({
      nom: fichier.name || "commande.pdf",
      mediaType: fichier.type || "application/pdf",
      base64: Buffer.from(await fichier.arrayBuffer()).toString("base64"),
    });
  } catch (erreur) {
    rediriger(chemin, "erreur", erreur instanceof Error ? erreur.message : "L'import de la commande a échoué.");
  }
  if (extrait.lignes.length === 0) rediriger(chemin, "erreur", "Aucune ligne reconnue dans le bon de commande.");

  const db = await getDb();
  const commandeId = crypto.randomUUID();
  await db.insert(commandes).values({
    id: commandeId,
    centreId: centre.id,
    fournisseur,
    dateCommande: extrait.dateCommande,
    fichierNom: fichier.name || "commande",
    creeLe: new Date().toISOString(),
  });
  await db.insert(lignesCommande).values(
    extrait.lignes.map((ligne) => {
      const unite = normaliserUnite(ligne.unite);
      const incertaine = ligne.quantite === null || ligne.confiance < SEUIL || unite === "colis";
      return {
        id: crypto.randomUUID(),
        commandeId,
        nomProduit: ligne.nomProduit,
        quantite: ligne.quantite,
        unite,
        confiance: ligne.confiance,
        statut: incertaine ? "a_valider" : "a_valider",
        produitStockId: null,
      };
    }),
  );
  const douteuses = extrait.lignes.filter((ligne) => ligne.quantite === null || ligne.confiance < SEUIL || normaliserUnite(ligne.unite) === "colis").length;
  rediriger(
    chemin,
    "message",
    douteuses > 0
      ? `${extrait.lignes.length} lignes lues, dont ${douteuses} à vérifier avant l'entrée en stock.`
      : `${extrait.lignes.length} lignes lues. Vérifiez-les puis validez l'entrée en stock.`,
  );
}

export async function validerLignes(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const commandeId = String(formData.get("commandeId") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "commandes");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const commandesListe = await commandesDuCentre(centre.id);
  const commande = commandesListe.find((item) => item.id === commandeId);
  if (!commande) rediriger(chemin, "erreur", "Commande introuvable.");

  const db = await getDb();
  const produits = await db.select().from(produitsStock).where(eq(produitsStock.centreId, centre.id));
  let validees = 0;
  for (const ligne of commande.lignes) {
    if (ligne.statut !== "a_valider") continue;
    if (formData.get(`ok_${ligne.id}`) !== "on") continue;
    const quantite = lireNombre(formData.get(`q_${ligne.id}`));
    const unite = normaliserUnite(String(formData.get(`u_${ligne.id}`) ?? ligne.unite));
    if (quantite === null || quantite <= 0) {
      rediriger(chemin, "erreur", `Indiquez une quantité pour ${ligne.nomProduit}.`);
    }
    const base = versBase(quantite, unite);
    if (!base) rediriger(chemin, "erreur", `Précisez une unité en kg, g, L, ml ou pièce pour ${ligne.nomProduit}.`);
    const nomNormalise = normaliserNom(ligne.nomProduit);
    let produit = produits.find((item) => item.nomNormalise === nomNormalise);
    if (produit && produit.uniteBase !== base.uniteBase) {
      rediriger(chemin, "erreur", `${ligne.nomProduit} existe déjà dans une autre unité.`);
    }
    if (!produit) {
      produit = {
        id: crypto.randomUUID(),
        centreId: centre.id,
        nom: ligne.nomProduit,
        nomNormalise,
        uniteBase: base.uniteBase,
      };
      await db.insert(produitsStock).values(produit);
      produits.push(produit);
    }
    await db.insert(mouvements).values({
      id: crypto.randomUUID(),
      produitId: produit.id,
      type: "commande",
      quantite: arrondir(base.quantite),
      date: commande.dateCommande || aujourdhuiParis(),
      repasId: null,
      ligneCommandeId: ligne.id,
      ingredientId: null,
    });
    await db
      .update(lignesCommande)
      .set({ quantite, unite, statut: "validee", produitStockId: produit.id })
      .where(and(eq(lignesCommande.id, ligne.id), eq(lignesCommande.commandeId, commande.id)));
    validees += 1;
  }
  rediriger(chemin, validees > 0 ? "message" : "erreur", validees > 0 ? `${validees} ligne${validees > 1 ? "s" : ""} entrée${validees > 1 ? "s" : ""} en stock.` : "Cochez au moins une ligne à valider.");
}

export async function ignorerLigne(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const ligneId = String(formData.get("ligneId") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "commandes");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const db = await getDb();
  const [ligne] = await db.select().from(lignesCommande).where(eq(lignesCommande.id, ligneId));
  if (!ligne) rediriger(chemin, "erreur", "Ligne introuvable.");
  const [commande] = await db.select().from(commandes).where(eq(commandes.id, ligne.commandeId));
  if (!commande || commande.centreId !== centre.id) rediriger(chemin, "erreur", "Ligne introuvable.");
  await db.update(lignesCommande).set({ statut: "ignoree" }).where(eq(lignesCommande.id, ligne.id));
  rediriger(chemin, "message", `${ligne.nomProduit} est ignoré.`);
}
