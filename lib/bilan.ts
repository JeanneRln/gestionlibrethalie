import type { LignePortion } from "@/lib/calcul";
import type { Comptes } from "@/lib/effectifs";
import { arrondir } from "@/lib/format";
import { assemblerLignes, consommationBase, grouperConsommes } from "@/lib/pointStock";
import { normaliserNom } from "@/lib/unites";
import { stockReel, type MouvementProjection } from "@/lib/projection";

export type LigneBilan = {
  produitId: string;
  nom: string;
  uniteBase: string;
  stock: number;
  parJour: Record<string, number>;
  aSortir: number;
  reste: number;
  sansChiffre: boolean;
  portion: number;
  portionUnite: string;
};

export type BilanSemaine = {
  lignes: LigneBilan[];
  nonComptes: string[];
};

export function bilanSemaine(entree: {
  produits: { id: string; nom: string; uniteBase: string }[];
  mouvements: MouvementProjection[];
  repas: { id: string; date: string; service: string; confirmeLe: string | null }[];
  plats: { id: string; repasId: string; nom: string }[];
  ingredients: { id: string; platId: string; nom: string; grammageCle: string; produitStockId: string | null }[];
  grammages: LignePortion[];
  inscrits: Comptes;
  absences: Record<string, Comptes>;
}): BilanSemaine {
  const parId = new Map(entree.repas.map((repas) => [repas.id, repas]));
  const lignes = new Map<string, LigneBilan>();
  const assurer = (produit: { id: string; nom: string; uniteBase: string }) => {
    const existant = lignes.get(produit.id);
    if (existant) return existant;
    const stock = arrondir(stockReel(entree.mouvements, produit.id));
    const cree = {
      produitId: produit.id,
      nom: produit.nom,
      uniteBase: produit.uniteBase,
      stock,
      parJour: {} as Record<string, number>,
      aSortir: 0,
      reste: stock,
      sansChiffre: false,
      portion: 0,
      portionUnite: "g",
    };
    lignes.set(produit.id, cree);
    return cree;
  };
  for (const produit of entree.produits) assurer(produit);

  const ouverts = entree.repas.filter((repas) => !repas.confirmeLe);
  const prevus = assemblerLignes({
    repas: ouverts,
    plats: entree.plats.filter((plat) => ouverts.some((repas) => repas.id === plat.repasId)),
    ingredients: entree.ingredients,
    grammages: entree.grammages,
    inscrits: entree.inscrits,
    absences: entree.absences,
    produits: entree.produits,
  });
  const nonComptes = new Set<string>();
  for (const groupe of grouperConsommes(prevus, entree.produits)) {
    const produit = entree.produits.find((item) => item.id === groupe.produitStockId);
    if (!produit) {
      if (groupe.theorique > 0) nonComptes.add(groupe.titre);
      continue;
    }
    const ligne = assurer(produit);
    for (const detail of groupe.lignes) {
      const repas = parId.get(detail.repasId);
      if (!repas) continue;
      const base = consommationBase(detail.unite, detail.theorique, produit.uniteBase, produit.nom);
      if (base === null) {
        ligne.sansChiffre = true;
        ligne.portion = arrondir(ligne.portion + detail.theorique);
        ligne.portionUnite = detail.unite;
        continue;
      }
      if (base <= 0) continue;
      ligne.parJour[repas.date] = arrondir((ligne.parJour[repas.date] ?? 0) + base);
      ligne.aSortir = arrondir(ligne.aSortir + base);
    }
  }

  for (const mouvement of entree.mouvements) {
    if (mouvement.type !== "repas" || !mouvement.repasId) continue;
    const repas = parId.get(mouvement.repasId);
    if (!repas?.confirmeLe) continue;
    const produit = entree.produits.find((item) => item.id === mouvement.produitId);
    if (!produit) continue;
    const ligne = assurer(produit);
    const quantite = arrondir(Math.abs(mouvement.quantite));
    if (quantite <= 0) continue;
    ligne.parJour[repas.date] = arrondir((ligne.parJour[repas.date] ?? 0) + quantite);
  }

  for (const ligne of lignes.values()) ligne.reste = arrondir(ligne.stock - ligne.aSortir);

  return {
    lignes: [...lignes.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    nonComptes: [...nonComptes].sort((a, b) => a.localeCompare(b, "fr")),
  };
}

export type ClasseBilan = "manque" | "reste" | "inutilise" | "pieces" | "equilibre" | "ignore";

const MOT_ENTIER = new Set(["sel", "ail", "sucre"]);
const DEDANS = ["serviette", "couvert", "huile", "vinaigre", "moutarde", "mayonnaise", "harissa", "fonds", "pulco", "cafe", "cacao", "concentre"];

export function proposableAuMenu(nom: string) {
  const texte = normaliserNom(nom);
  const mots = texte.split(" ").filter(Boolean);
  if (mots.some((mot) => MOT_ENTIER.has(mot))) return false;
  return !DEDANS.some((mot) => texte.includes(mot));
}

export function classerBilan(ligne: LigneBilan): ClasseBilan {
  const marge = ligne.uniteBase === "piece" ? 0.5 : 100;
  if (ligne.aSortir <= marge && ligne.stock <= marge && !ligne.sansChiffre) return "ignore";
  if (ligne.sansChiffre && ligne.aSortir <= marge) return "pieces";
  if (ligne.reste < -marge) return "manque";
  if (ligne.aSortir <= marge && ligne.stock > marge) return "inutilise";
  if (ligne.reste > marge) return "reste";
  return "equilibre";
}
