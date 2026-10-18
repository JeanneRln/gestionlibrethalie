import type { ServiceId } from "@/lib/services";

export type LignePortion = {
  cle: string;
  serviceGroupe: "repas_principal" | "petit_dej_gouter" | "diner_enfant";
  unite: string;
  retenuEnfant: number;
  retenuAdo: number;
  retenuAdulte: number;
};

export type ResultatQuantite = {
  total: number;
  unite: string;
  portions: { enfant: number; ado: number; adulte: number };
};

export function quantiteTheorique(
  cle: string,
  service: ServiceId,
  presents: { enfant: number; ado: number; adulte: number },
  lignes: LignePortion[],
): ResultatQuantite | null {
  const famille = lignes.filter((ligne) => ligne.cle === cle);
  if (famille.length === 0) return null;
  const principale = famille.find((ligne) => ligne.serviceGroupe === "repas_principal");
  const petitDej = famille.find((ligne) => ligne.serviceGroupe === "petit_dej_gouter");
  const diner = famille.find((ligne) => ligne.serviceGroupe === "diner_enfant");
  const repli = principale ?? petitDej ?? diner;
  if (!repli) return null;

  if (service === "petit_dejeuner" || service === "gouter") {
    const ligne = petitDej ?? repli;
    return total(ligne, presents);
  }

  if (service === "diner") {
    const portionEnfant = (diner ?? principale ?? repli).retenuEnfant;
    const base = principale ?? repli;
    return total(
      {
        ...base,
        retenuEnfant: portionEnfant,
      },
      presents,
    );
  }

  return total(principale ?? repli, presents);
}

function total(
  ligne: { unite: string; retenuEnfant: number; retenuAdo: number; retenuAdulte: number },
  presents: { enfant: number; ado: number; adulte: number },
): ResultatQuantite {
  const portions = {
    enfant: ligne.retenuEnfant,
    ado: ligne.retenuAdo,
    adulte: ligne.retenuAdulte,
  };
  return {
    unite: ligne.unite,
    portions,
    total: presents.enfant * portions.enfant + presents.ado * portions.ado + presents.adulte * portions.adulte,
  };
}
