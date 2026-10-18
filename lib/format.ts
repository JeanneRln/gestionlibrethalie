const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formaterNombre(valeur: number) {
  return nombre.format(valeur);
}

export function formaterPortion(valeur: number, unite: string) {
  if (unite === "piece") {
    return `${nombre.format(valeur)} pièce${valeur > 1 ? "s" : ""}`;
  }
  if (unite === "ml") return `${nombre.format(valeur)} ml`;
  return `${nombre.format(valeur)} g`;
}

export function formaterQuantite(valeur: number, uniteBase: string) {
  if (uniteBase === "g") {
    if (Math.abs(valeur) >= 1000) return `${nombre.format(valeur / 1000)} kg`;
    return `${nombre.format(valeur)} g`;
  }
  if (uniteBase === "ml") {
    if (Math.abs(valeur) >= 1000) return `${nombre.format(valeur / 1000)} L`;
    return `${nombre.format(valeur)} ml`;
  }
  const arrondi = Math.abs(valeur);
  return `${nombre.format(valeur)} pièce${arrondi > 1 ? "s" : ""}`;
}

export function arrondir(valeur: number) {
  return Math.round(valeur * 1000) / 1000;
}

export function lireNombre(valeur: FormDataEntryValue | null) {
  if (typeof valeur !== "string") return null;
  const normalise = valeur.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalise) return null;
  const nombreLu = Number(normalise);
  return Number.isFinite(nombreLu) ? nombreLu : null;
}

export function slugifier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
