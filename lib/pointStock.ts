import { quantiteTheorique, type LignePortion } from "@/lib/calcul";
import { presents, type Comptes } from "@/lib/effectifs";
import { arrondir } from "@/lib/format";
import { estService, indexService } from "@/lib/services";
import { normaliserNom, uniteCompatible } from "@/lib/unites";

const MOTS_VIDES = new Set([
  "de", "la", "le", "les", "au", "aux", "et", "ou", "du", "des", "un", "une",
  "avec", "pour", "dans", "sur", "par", "en", "autre", "autres", "type", "preparation",
]);

export function jetons(nom: string) {
  return normaliserNom(nom)
    .split(" ")
    .filter((mot) => mot.length >= 3 && !MOTS_VIDES.has(mot) && !/\d/.test(mot));
}

function proche(gauche: string, droite: string) {
  if (gauche === droite) return true;
  const court = gauche.length <= droite.length ? gauche : droite;
  const long = gauche.length <= droite.length ? droite : gauche;
  if (court.length < 4 || !long.startsWith(court)) return false;
  const reste = long.slice(court.length);
  return reste === "s" || reste === "x" || reste === "es";
}

export function produitProbable(
  ingredient: string,
  plat: string,
  platSimple: boolean,
  produits: { id: string; nom: string }[],
) {
  const parPlat = platSimple ? meilleur(plat, produits) : null;
  if (parPlat) return parPlat;
  return meilleur(ingredient, produits);
}

function meilleur(texte: string, produits: { id: string; nom: string }[]) {
  const mots = jetons(texte);
  if (mots.length === 0) return null;
  const notes = produits
    .map((produit) => {
      const motsProduit = jetons(produit.nom);
      const trouves = mots.filter((mot) => motsProduit.some((autre) => proche(mot, autre)));
      const exact = motsProduit.length > 0 && motsProduit.every((mot) => mots.some((autre) => proche(mot, autre)));
      return {
        id: produit.id,
        nom: produit.nom,
        taille: motsProduit.length,
        trouves: trouves.length,
        exact,
        score: trouves.reduce((somme, mot) => somme + mot.length, 0),
      };
    })
    .filter((note) => note.score > 0)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.trouves - a.trouves || b.score - a.score || a.taille - b.taille);
  const premier = notes[0];
  const second = notes[1];
  if (!premier) return null;
  if (!second) return premier;
  if (premier.exact && !second.exact) return premier;
  if (premier.trouves > second.trouves) return premier;
  if (premier.score > second.score) return premier;
  if (premier.taille < second.taille) return premier;
  return null;
}

export type RepasPoint = {
  id: string;
  date: string;
  service: string;
  confirmeLe: string | null;
};

export function estAvant(
  repas: { date: string; service: string },
  limite: { date: string; service: string },
) {
  if (repas.date !== limite.date) return repas.date < limite.date;
  return indexService(repas.service) < indexService(limite.service);
}

export type MomentStock = { cote: "avant" | "apres"; repasId: string };

export function lireMoment(valeur: string): MomentStock | null {
  const separateur = valeur.indexOf(":");
  if (separateur <= 0) return null;
  const cote = valeur.slice(0, separateur);
  const repasId = valeur.slice(separateur + 1);
  if ((cote !== "avant" && cote !== "apres") || !repasId) return null;
  return { cote, repasId };
}

export function repasDuMoment<T extends RepasPoint>(liste: T[], moment: MomentStock) {
  const limite = liste.find((repas) => repas.id === moment.repasId);
  if (!limite) return [];
  return liste.filter((repas) => {
    if (repas.confirmeLe) return false;
    if (repas.id === limite.id) return moment.cote === "apres";
    return estAvant(repas, limite);
  });
}

export type LignePoint = {
  ingredientId: string;
  repasId: string;
  platId: string;
  platNom: string;
  nom: string;
  grammageCle: string;
  unite: string;
  theorique: number;
  produitStockId: string | null;
};

export function assemblerLignes(entree: {
  repas: { id: string; service: string }[];
  plats: { id: string; repasId: string; nom: string }[];
  ingredients: { id: string; platId: string; nom: string; grammageCle: string; produitStockId: string | null }[];
  grammages: LignePortion[];
  inscrits: Comptes;
  absences: Record<string, Comptes>;
  produits: { id: string; nom: string }[];
}) {
  const lignes: LignePoint[] = [];
  const ajouter = (ligne: Omit<LignePoint, "unite" | "theorique"> & { service: string }) => {
    if (!estService(ligne.service)) return;
    const compte = presents(entree.inscrits, entree.absences[ligne.repasId] ?? {});
    const quantite = quantiteTheorique(ligne.grammageCle, ligne.service, compte, entree.grammages);
    const famille = entree.grammages.find((item) => item.cle === ligne.grammageCle);
    lignes.push({
      ingredientId: ligne.ingredientId,
      repasId: ligne.repasId,
      platId: ligne.platId,
      platNom: ligne.platNom,
      nom: ligne.nom,
      grammageCle: ligne.grammageCle,
      unite: quantite?.unite ?? famille?.unite ?? "g",
      theorique: quantite?.total ?? 0,
      produitStockId: ligne.produitStockId,
    });
  };

  for (const ingredient of entree.ingredients) {
    const plat = entree.plats.find((item) => item.id === ingredient.platId);
    const repas = plat ? entree.repas.find((item) => item.id === plat.repasId) : undefined;
    if (!plat || !repas) continue;
    if (repas.service === "petit_dejeuner" && !ingredient.produitStockId && jetons(ingredient.nom).includes("jus")) continue;
    ajouter({
      ingredientId: ingredient.id,
      repasId: repas.id,
      platId: plat.id,
      platNom: plat.nom,
      nom: ingredient.nom,
      grammageCle: ingredient.grammageCle,
      service: repas.service,
      produitStockId: ingredient.produitStockId,
    });
  }

  for (const plat of entree.plats) {
    if (entree.ingredients.some((ingredient) => ingredient.platId === plat.id)) continue;
    const repas = entree.repas.find((item) => item.id === plat.repasId);
    if (!repas) continue;
    const produit = produitProbable(plat.nom, plat.nom, true, entree.produits);
    ajouter({
      ingredientId: `plat:${plat.id}`,
      repasId: repas.id,
      platId: plat.id,
      platNom: plat.nom,
      nom: plat.nom,
      grammageCle: famillePourPlat(plat.nom),
      service: repas.service,
      produitStockId: produit?.id ?? null,
    });
  }

  const jus = entree.produits.filter((produit) => jetons(produit.nom).includes("jus"));
  const laits = entree.produits.filter((produit) => {
    const mots = jetons(produit.nom);
    return mots.includes("lait") && !mots.includes("chocolat") && !mots.includes("pain");
  });
  for (const repas of entree.repas) {
    if (repas.service !== "petit_dejeuner") continue;
    const deja = new Set(lignes.filter((ligne) => ligne.repasId === repas.id && ligne.produitStockId).map((ligne) => ligne.produitStockId));
    for (const produit of [...jus, ...laits]) {
      if (deja.has(produit.id)) continue;
      const lait = jetons(produit.nom).includes("lait");
      ajouter({
        ingredientId: `boisson:${repas.id}:${produit.id}`,
        repasId: repas.id,
        platId: `boisson:${repas.id}`,
        platNom: "Petit-déjeuner",
        nom: produit.nom,
        grammageCle: lait ? "lait_petit_dejeuner" : "jus",
        service: repas.service,
        produitStockId: produit.id,
      });
    }
  }

  return lignes;
}

function famillePourPlat(nom: string) {
  const texte = normaliserNom(nom);
  if (texte.includes("kiri") || texte.includes("friand") || texte.includes("fromage") || texte.includes("vache")) return "fromage";
  if (texte.includes("jus")) return "jus";
  if (texte.includes("lait")) return "lait_petit_dejeuner";
  if (texte.includes("pain")) return "pain_pd";
  return "fromage";
}

export type GroupeConsomme = {
  cle: string;
  titre: string;
  plats: string[];
  unite: string;
  produitStockId: string | null;
  theorique: number;
  lignes: LignePoint[];
};

export function grouperConsommes(lignes: LignePoint[], produits: { id: string; nom: string }[]) {
  const parPlat = new Map<string, number>();
  for (const ligne of lignes) parPlat.set(ligne.platId, (parPlat.get(ligne.platId) ?? 0) + 1);
  const groupes: GroupeConsomme[] = [];
  for (const ligne of lignes) {
    const lie = ligne.produitStockId ? produits.find((produit) => produit.id === ligne.produitStockId) : undefined;
    const probable = lie ?? produitProbable(ligne.nom, ligne.platNom, (parPlat.get(ligne.platId) ?? 0) === 1, produits);
    const cle = probable ? `p:${probable.id}:${ligne.unite}` : `i:${ligne.nom}:${ligne.grammageCle}`;
    const existant = groupes.find((groupe) => groupe.cle === cle);
    if (!existant) {
      groupes.push({
        cle,
        titre: probable?.nom ?? ligne.nom,
        plats: [ligne.platNom],
        unite: ligne.unite,
        produitStockId: probable?.id ?? null,
        theorique: ligne.theorique,
        lignes: [ligne],
      });
      continue;
    }
    existant.theorique = arrondir(existant.theorique + ligne.theorique);
    existant.lignes.push(ligne);
    if (!existant.plats.includes(ligne.platNom)) existant.plats.push(ligne.platNom);
  }
  return groupes;
}

export function quantiteARegler(uniteFamille: string, total: number) {
  if (uniteFamille === "piece") return { unite: "piece" as const, label: "pièces", valeur: arrondir(total) };
  if (uniteFamille === "ml") return { unite: "L" as const, label: "L", valeur: arrondir(total / 1000) };
  return { unite: "kg" as const, label: "kg", valeur: arrondir(total / 1000) };
}

export function saisieRegulation(uniteFamille: string, total: number, uniteBase: string, nomProduit = "") {
  if (uniteCompatible(uniteFamille, uniteBase)) return quantiteARegler(uniteFamille, total);
  if (uniteBase === "piece" && uniteFamille === "ml") {
    const contenu = volumeParPiece(nomProduit);
    if (contenu) return { unite: "piece" as const, label: "pièces", valeur: arrondir(total / contenu) };
  }
  if (uniteBase === "piece") return { unite: "piece" as const, label: "pièces", valeur: 0 };
  if (uniteBase === "ml") return { unite: "L" as const, label: "L", valeur: 0 };
  return { unite: "kg" as const, label: "kg", valeur: 0 };
}

function volumeParPiece(nom: string) {
  const texte = normaliserNom(nom);
  const centilitres = texte.match(/(\d+(?:[.,]\d+)?)\s*cl\b/);
  if (centilitres) return Number(centilitres[1].replace(",", ".")) * 10;
  const litres = texte.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (litres) return Number(litres[1].replace(",", ".")) * 1000;
  return null;
}

export function repartir(total: number, poids: number[]) {
  if (poids.length === 0) return [];
  const somme = poids.reduce((acc, valeur) => acc + valeur, 0);
  if (somme <= 0) {
    const vide = poids.map(() => 0);
    vide[0] = arrondir(total);
    return vide;
  }
  const parts = poids.map((valeur) => arrondir((total * valeur) / somme));
  const ecart = arrondir(total - parts.reduce((acc, valeur) => acc + valeur, 0));
  parts[parts.length - 1] = arrondir((parts[parts.length - 1] ?? 0) + ecart);
  return parts;
}
