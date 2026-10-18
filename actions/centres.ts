"use server";

import { getDb, semerCentre } from "@/lib/db";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { slugifier } from "@/lib/format";
import { trouverCentre } from "@/lib/donnees";

export async function ajouterCentre(formData: FormData) {
  const nom = String(formData.get("nom") ?? "").trim();
  const slug = slugifier(nom);
  if (!nom || !slug) rediriger("/centres/menton/menus", "erreur", "Indiquez un nom de centre.");
  if (await trouverCentre(slug)) {
    rediriger(cheminCentre(slug, "menus"), "erreur", "Un centre porte déjà ce nom.");
  }
  const db = await getDb();
  await semerCentre(db, { id: crypto.randomUUID(), slug, nom });
  rediriger(cheminCentre(slug, "menus"), "message", `${nom} est ajouté.`);
}
