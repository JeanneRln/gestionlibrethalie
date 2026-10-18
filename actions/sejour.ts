"use server";

import { eq } from "drizzle-orm";
import { creneauxSejour } from "@/lib/dates";
import { trouverCentre } from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { repas, sejours } from "@/lib/db/schema";
import { effacerRepas } from "@/lib/ecritures";
import { cheminCentre, rediriger } from "@/lib/navigation";
import { estService, indexService } from "@/lib/services";

export async function enregistrerSejour(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const dateDebut = String(formData.get("dateDebut") ?? "");
  const dateFin = String(formData.get("dateFin") ?? "");
  const repasDebut = String(formData.get("repasDebut") ?? "");
  const repasFin = String(formData.get("repasFin") ?? "");
  const chemin = cheminCentre(slug, "menus");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDebut) || !/^\d{4}-\d{2}-\d{2}$/.test(dateFin)) {
    rediriger(chemin, "erreur", "Indiquez une date de début et une date de fin.");
  }
  if (!estService(repasDebut) || !estService(repasFin)) {
    rediriger(chemin, "erreur", "Choisissez le repas de début et le repas de fin.");
  }
  if (dateFin < dateDebut || (dateFin === dateDebut && indexService(repasFin) < indexService(repasDebut))) {
    rediriger(chemin, "erreur", "Le repas de fin doit arriver après le repas de début.");
  }
  const creneaux = creneauxSejour(dateDebut, dateFin, repasDebut, repasFin);
  if (creneaux.length === 0 || creneaux.length > 248) {
    rediriger(chemin, "erreur", "Le séjour doit tenir dans 62 jours.");
  }

  const db = await getDb();
  const [existant] = await db.select().from(sejours).where(eq(sejours.centreId, centre.id));
  const sejourId = existant?.id ?? crypto.randomUUID();
  if (existant) {
    await db
      .update(sejours)
      .set({ dateDebut, dateFin, repasDebut, repasFin })
      .where(eq(sejours.id, existant.id));
  } else {
    await db.insert(sejours).values({ id: sejourId, centreId: centre.id, dateDebut, dateFin, repasDebut, repasFin });
  }

  const anciens = await db.select().from(repas).where(eq(repas.sejourId, sejourId));
  const gardes = new Set(creneaux.map((creneau) => `${creneau.date}:${creneau.service}`));
  for (const ancien of anciens) {
    if (!gardes.has(`${ancien.date}:${ancien.service}`)) await effacerRepas(db, ancien.id);
  }
  const deja = new Set(anciens.map((ancien) => `${ancien.date}:${ancien.service}`));
  const nouveaux = creneaux.filter((creneau) => !deja.has(`${creneau.date}:${creneau.service}`));
  if (nouveaux.length > 0) {
    await db.insert(repas).values(
      nouveaux.map((creneau) => ({
        id: crypto.randomUUID(),
        sejourId,
        date: creneau.date,
        service: creneau.service,
        confirmeLe: null,
      })),
    );
  }
  rediriger(chemin, "message", "La grille du séjour est à jour.");
}
