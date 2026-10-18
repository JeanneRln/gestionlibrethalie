export type UniteBase = "g" | "ml" | "piece";

export const UNITES_COMMANDE = [
  { id: "kg", label: "kg" },
  { id: "g", label: "g" },
  { id: "L", label: "L" },
  { id: "ml", label: "ml" },
  { id: "piece", label: "pièce" },
  { id: "colis", label: "colis" },
] as const;

export function normaliserNom(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normaliserUnite(unite: string) {
  const texte = unite
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
  if (["kg", "kilo", "kilos", "kilogramme", "kilogrammes"].includes(texte)) return "kg";
  if (["g", "gr", "gramme", "grammes"].includes(texte)) return "g";
  if (["l", "lt", "litre", "litres"].includes(texte)) return "L";
  if (["ml", "millilitre", "millilitres"].includes(texte)) return "ml";
  if (["piece", "pieces", "pce", "u", "un", "unite", "unites", "pc"].includes(texte)) return "piece";
  if (["colis", "ctn", "carton", "cartons"].includes(texte)) return "colis";
  return texte || "piece";
}

export function versBase(quantite: number, unite: string): { uniteBase: UniteBase; quantite: number } | null {
  switch (normaliserUnite(unite)) {
    case "kg":
      return { uniteBase: "g", quantite: quantite * 1000 };
    case "g":
      return { uniteBase: "g", quantite };
    case "L":
      return { uniteBase: "ml", quantite: quantite * 1000 };
    case "ml":
      return { uniteBase: "ml", quantite };
    case "piece":
      return { uniteBase: "piece", quantite };
    default:
      return null;
  }
}

export function uniteCompatible(uniteIngredient: string, uniteBase: string) {
  const converti = versBase(1, uniteIngredient);
  return converti?.uniteBase === uniteBase;
}
