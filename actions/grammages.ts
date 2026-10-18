"use server";

import { eq } from "drizzle-orm";
import { grammagesDuCentre, trouverCentre } from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { grammages } from "@/lib/db/schema";
import { arrondir, lireNombre } from "@/lib/format";
import { cheminCentre, rediriger } from "@/lib/navigation";

export async function enregistrerGrammages(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "grammages");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const lignes = await grammagesDuCentre(centre.id);
  const db = await getDb();

  for (const ligne of lignes) {
    const colonnes =
      ligne.serviceGroupe === "diner_enfant"
        ? (["enfant"] as const)
        : (["enfant", "ado", "adulte"] as const);
    const valeurs = {
      enfant: lireNombre(formData.get(`${ligne.id}_enfant`)),
      ado: lireNombre(formData.get(`${ligne.id}_ado`)),
      adulte: lireNombre(formData.get(`${ligne.id}_adulte`)),
    };
    for (const colonne of colonnes) {
      const valeur = valeurs[colonne];
      const base = colonne === "enfant" ? ligne.baseEnfant : colonne === "ado" ? ligne.baseAdo : ligne.baseAdulte;
      if (valeur === null || valeur + 0.001 < base) {
        rediriger(chemin, "erreur", `${ligne.libelle} : la portion retenue ne peut pas descendre sous le GEMRCN (${base}).`);
      }
    }
    await db
      .update(grammages)
      .set({
        retenuEnfant: arrondir(valeurs.enfant ?? ligne.retenuEnfant),
        retenuAdo: arrondir(ligne.serviceGroupe === "diner_enfant" ? ligne.retenuAdo : (valeurs.ado ?? ligne.retenuAdo)),
        retenuAdulte: arrondir(
          ligne.serviceGroupe === "diner_enfant" ? ligne.retenuAdulte : (valeurs.adulte ?? ligne.retenuAdulte),
        ),
      })
      .where(eq(grammages.id, ligne.id));
  }
  rediriger(chemin, "message", "Portions retenues enregistrées.");
}
