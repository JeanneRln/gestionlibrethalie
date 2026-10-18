import { AGES, TRANCHE_ADULTE } from "@/lib/effectifs";

function jeton(ligne: string) {
  const parSeparateur = ligne.split(/[\t;,|]/).map((partie) => partie.trim()).filter(Boolean);
  if (parSeparateur.length >= 2) return parSeparateur;
  return ligne.trim().split(/\s+/).filter(Boolean);
}

function entier(valeur: string) {
  const nombre = Number(valeur.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(nombre) || nombre < 0) return null;
  return String(Math.round(nombre));
}

export function parserCollage(texte: string): Record<string, string> | null {
  const lignes = texte
    .trim()
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter(Boolean);
  if (lignes.length === 0) return null;

  if (lignes.length === 1) {
    const nombres = jeton(lignes[0])
      .map((valeur) => entier(valeur))
      .filter((valeur): valeur is string => valeur !== null);
    if (nombres.length >= 12) {
      const resultat: Record<string, string> = {};
      AGES.forEach((age, index) => {
        resultat[String(age)] = nombres[index] ?? "0";
      });
      resultat[TRANCHE_ADULTE] = nombres[11] ?? "0";
      return resultat;
    }
    return null;
  }

  const resultat: Record<string, string> = {};
  let trouves = 0;
  for (const ligne of lignes) {
    const parties = jeton(ligne);
    if (parties.length < 2) continue;
    const libelle = parties[0]
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    const valeur = entier(parties[parties.length - 1] ?? "");
    if (valeur === null) continue;
    if (libelle.includes("adulte")) {
      resultat[TRANCHE_ADULTE] = valeur;
      trouves += 1;
      continue;
    }
    const age = Number(libelle.replace(/\D/g, ""));
    if (age >= 7 && age <= 17) {
      resultat[String(age)] = valeur;
      trouves += 1;
    }
  }
  return trouves >= 2 ? resultat : null;
}
