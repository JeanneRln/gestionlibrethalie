export const AGES = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
export const TRANCHE_ADULTE = "adulte";

export type Comptes = Record<string, number>;

export function comptesVides(): Comptes {
  const comptes: Comptes = { [TRANCHE_ADULTE]: 0 };
  for (const age of AGES) comptes[String(age)] = 0;
  return comptes;
}

export function presents(inscrits: Comptes, absents: Comptes = {}) {
  let enfant = 0;
  let ado = 0;
  const detail: Comptes = {};
  for (const age of AGES) {
    const cle = String(age);
    const nombre = Math.max(0, (inscrits[cle] ?? 0) - (absents[cle] ?? 0));
    detail[cle] = nombre;
    if (age <= 10) enfant += nombre;
    else ado += nombre;
  }
  const adulte = Math.max(0, (inscrits[TRANCHE_ADULTE] ?? 0) - (absents[TRANCHE_ADULTE] ?? 0));
  detail[TRANCHE_ADULTE] = adulte;
  return { enfant, ado, adulte, total: enfant + ado + adulte, detail };
}

export function inscritsParTranche(inscrits: Comptes) {
  return presents(inscrits, {});
}
