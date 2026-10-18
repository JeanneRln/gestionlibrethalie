"use server";

import { and, eq, inArray } from "drizzle-orm";
import { repasParId, sejourDuCentre, trouverCentre } from "@/lib/donnees";
import { getDb } from "@/lib/db";
import { absences, effectifs, repas } from "@/lib/db/schema";
import { AGES, TRANCHE_ADULTE } from "@/lib/effectifs";
import { lireNombre } from "@/lib/format";
import { cheminCentre, rediriger } from "@/lib/navigation";

const TRANCHES = [...AGES.map(String), TRANCHE_ADULTE];

export async function enregistrerPyramide(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const centre = await trouverCentre(slug);
  const chemin = cheminCentre(slug || "menton", "effectifs");
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const sejour = await sejourDuCentre(centre.id);
  if (!sejour) rediriger(chemin, "erreur", "Créez d'abord le séjour dans l'onglet Menus.");

  const db = await getDb();
  for (const tranche of TRANCHES) {
    const lu = lireNombre(formData.get(`tranche_${tranche}`));
    const nombre = lu === null ? 0 : Math.max(0, Math.round(lu));
    const [existant] = await db
      .select()
      .from(effectifs)
      .where(and(eq(effectifs.sejourId, sejour.id), eq(effectifs.tranche, tranche)));
    if (existant) {
      await db.update(effectifs).set({ nombre }).where(eq(effectifs.id, existant.id));
    } else {
      await db.insert(effectifs).values({ id: crypto.randomUUID(), sejourId: sejour.id, tranche, nombre });
    }
  }

  const inscrits = new Map<string, number>();
  for (const tranche of TRANCHES) {
    const lu = lireNombre(formData.get(`tranche_${tranche}`));
    inscrits.set(tranche, lu === null ? 0 : Math.max(0, Math.round(lu)));
  }
  const repasLignes = await db.select().from(repas).where(eq(repas.sejourId, sejour.id));
  const ids = repasLignes.map((ligne) => ligne.id);
  const lignes = ids.length === 0 ? [] : await db.select().from(absences).where(inArray(absences.repasId, ids));
  let ajustes = 0;
  for (const absence of lignes) {
    const plafond = inscrits.get(absence.tranche) ?? 0;
    if (absence.nombre > plafond) {
      await db.update(absences).set({ nombre: plafond }).where(eq(absences.id, absence.id));
      ajustes += 1;
    }
  }
  rediriger(
    chemin,
    "message",
    ajustes > 0
      ? "Pyramide enregistrée. Certaines absences dépassaient les inscrits : elles ont été ramenées au maximum."
      : "Pyramide enregistrée.",
  );
}

export async function enregistrerAbsences(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const repasId = String(formData.get("repasId") ?? "");
  const chemin = cheminCentre(slug || "menton", "effectifs");
  const centre = await trouverCentre(slug);
  if (!centre) rediriger("/centres/menton/menus", "erreur", "Centre introuvable.");
  const sejour = await sejourDuCentre(centre.id);
  const ligneRepas = await repasParId(repasId);
  if (!sejour || !ligneRepas || ligneRepas.sejourId !== sejour.id) {
    rediriger(chemin, "erreur", "Repas introuvable.");
  }

  const db = await getDb();
  const inscrits = await db.select().from(effectifs).where(eq(effectifs.sejourId, sejour.id));
  const plafonds = new Map(inscrits.map((ligne) => [ligne.tranche, ligne.nombre]));

  for (const tranche of TRANCHES) {
    const lu = lireNombre(formData.get(`absent_${tranche}`));
    const demande = lu === null ? 0 : Math.max(0, Math.round(lu));
    const plafond = plafonds.get(tranche) ?? 0;
    if (demande > plafond) {
      rediriger(chemin, "erreur", "Les absents ne peuvent pas dépasser les inscrits de la pyramide.");
    }
    const [existant] = await db
      .select()
      .from(absences)
      .where(and(eq(absences.repasId, repasId), eq(absences.tranche, tranche)));
    if (existant) {
      await db.update(absences).set({ nombre: demande }).where(eq(absences.id, existant.id));
    } else if (demande > 0) {
      await db.insert(absences).values({ id: crypto.randomUUID(), repasId, tranche, nombre: demande });
    }
  }
  rediriger(chemin, "message", "Absents enregistrés.");
}
