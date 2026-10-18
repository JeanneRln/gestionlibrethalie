import { quantiteTheorique, type LignePortion } from "@/lib/calcul";
import { repasEstPasse } from "@/lib/dates";
import { presents, type Comptes } from "@/lib/effectifs";
import { indexService, type ServiceId } from "@/lib/services";
import { uniteCompatible, versBase } from "@/lib/unites";

export type MouvementProjection = {
  produitId: string;
  type: string;
  quantite: number;
  date: string;
  repasId: string | null;
  ingredientId: string | null;
};

export type RepasProjection = {
  id: string;
  date: string;
  service: ServiceId;
  confirmeLe: string | null;
};

export type IngredientProjection = {
  id: string;
  repasId: string;
  nom: string;
  grammageCle: string;
  produitStockId: string | null;
};

export type ProduitProjection = {
  id: string;
  uniteBase: string;
};

export type JourProjection = {
  date: string;
  repas: {
    id: string;
    service: ServiceId;
    confirme: boolean;
    passe: boolean;
    deductions: { produitId: string; quantite: number; nom: string }[];
    nonRattaches: string[];
  }[];
  stocks: { produitId: string; quantite: number }[];
};

export function construireProjection(entree: {
  jours: string[];
  produits: ProduitProjection[];
  mouvements: MouvementProjection[];
  repas: RepasProjection[];
  ingredients: IngredientProjection[];
  grammages: LignePortion[];
  inscrits: Comptes;
  absences: Record<string, Comptes>;
  maintenant?: Date;
}): JourProjection[] {
  const maintenant = entree.maintenant ?? new Date();
  const produits = new Map(entree.produits.map((produit) => [produit.id, produit]));
  const evenements: { date: string; ordre: number; produitId: string; delta: number }[] = [];

  for (const mouvement of entree.mouvements) {
    if (mouvement.type === "repas") continue;
    evenements.push({ date: mouvement.date, ordre: 0, produitId: mouvement.produitId, delta: mouvement.quantite });
  }

  const details = new Map<string, JourProjection["repas"][number]>();

  for (const repas of entree.repas) {
    const ordre = 1 + Math.max(0, indexService(repas.service));
    const confirms = repas.confirmeLe !== null;
    const deductions: { produitId: string; quantite: number; nom: string }[] = [];
    const nonRattaches: string[] = [];
    const compte = presents(entree.inscrits, entree.absences[repas.id] ?? {});

    if (confirms) {
      for (const mouvement of entree.mouvements) {
        if (mouvement.type === "repas" && mouvement.repasId === repas.id) {
          evenements.push({ date: repas.date, ordre, produitId: mouvement.produitId, delta: mouvement.quantite });
          const ingredient = entree.ingredients.find((item) => item.id === mouvement.ingredientId);
          deductions.push({
            produitId: mouvement.produitId,
            quantite: Math.abs(mouvement.quantite),
            nom: ingredient?.nom ?? "Sortie",
          });
        }
      }
    } else {
      for (const ingredient of entree.ingredients.filter((item) => item.repasId === repas.id)) {
        const theorique = quantiteTheorique(ingredient.grammageCle, repas.service, compte, entree.grammages);
        if (!theorique || theorique.total <= 0) continue;
        const produit = ingredient.produitStockId ? produits.get(ingredient.produitStockId) : undefined;
        if (!produit || !uniteCompatible(theorique.unite, produit.uniteBase)) {
          nonRattaches.push(ingredient.nom);
          continue;
        }
        const converti = versBase(theorique.total, theorique.unite);
        if (!converti) {
          nonRattaches.push(ingredient.nom);
          continue;
        }
        deductions.push({ produitId: produit.id, quantite: converti.quantite, nom: ingredient.nom });
        evenements.push({ date: repas.date, ordre, produitId: produit.id, delta: -converti.quantite });
      }
    }

    details.set(repas.id, {
      id: repas.id,
      service: repas.service,
      confirme: confirms,
      passe: repasEstPasse(repas.date, repas.service, maintenant),
      deductions,
      nonRattaches,
    });
  }

  const stock = new Map<string, number>();
  for (const produit of entree.produits) stock.set(produit.id, 0);
  const parDate = new Map<string, typeof evenements>();
  for (const evenement of evenements) {
    const liste = parDate.get(evenement.date) ?? [];
    liste.push(evenement);
    parDate.set(evenement.date, liste);
  }

  const premier = entree.jours[0];
  if (premier) {
    for (const date of [...parDate.keys()].filter((date) => date < premier).sort()) {
      appliquer(stock, parDate.get(date) ?? []);
    }
  }

  return entree.jours.map((date) => {
    appliquer(stock, parDate.get(date) ?? []);
    const repas = entree.repas
      .filter((item) => item.date === date)
      .sort((a, b) => indexService(a.service) - indexService(b.service))
      .map((item) => details.get(item.id))
      .filter((item): item is JourProjection["repas"][number] => Boolean(item));
    return {
      date,
      repas,
      stocks: entree.produits.map((produit) => ({ produitId: produit.id, quantite: stock.get(produit.id) ?? 0 })),
    };
  });
}

function appliquer(stock: Map<string, number>, evenements: { ordre: number; produitId: string; delta: number }[]) {
  for (const evenement of [...evenements].sort((a, b) => a.ordre - b.ordre)) {
    stock.set(evenement.produitId, (stock.get(evenement.produitId) ?? 0) + evenement.delta);
  }
}

export function stockReel(mouvements: MouvementProjection[], produitId: string) {
  return mouvements.filter((mouvement) => mouvement.produitId === produitId).reduce((somme, mouvement) => somme + mouvement.quantite, 0);
}
