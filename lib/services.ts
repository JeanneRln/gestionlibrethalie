export const SERVICES = [
  { id: "petit_dejeuner", label: "Petit-déjeuner", heure: "08:00" },
  { id: "dejeuner", label: "Déjeuner", heure: "12:30" },
  { id: "gouter", label: "Goûter", heure: "16:30" },
  { id: "diner", label: "Dîner", heure: "19:30" },
] as const;

export type ServiceId = (typeof SERVICES)[number]["id"];

export const TYPES_PLAT = [
  { id: "entree", label: "Entrée" },
  { id: "plat", label: "Plat" },
  { id: "accompagnement", label: "Accompagnement" },
  { id: "produit_laitier", label: "Produit laitier" },
  { id: "dessert", label: "Dessert" },
  { id: "autre", label: "Autre" },
] as const;

export type TypePlat = (typeof TYPES_PLAT)[number]["id"];

export const FOURNISSEURS = [
  { id: "transgourmet", label: "Transgourmet" },
  { id: "sysco", label: "Sysco" },
  { id: "vivalya", label: "Vivalya" },
] as const;

export type FournisseurId = (typeof FOURNISSEURS)[number]["id"];

export function estService(valeur: string): valeur is ServiceId {
  return SERVICES.some((service) => service.id === valeur);
}

export function estTypePlat(valeur: string): valeur is TypePlat {
  return TYPES_PLAT.some((type) => type.id === valeur);
}

export function estFournisseur(valeur: string): valeur is FournisseurId {
  return FOURNISSEURS.some((fournisseur) => fournisseur.id === valeur);
}

export function libelleService(id: string) {
  return SERVICES.find((service) => service.id === id)?.label ?? id;
}

export function libelleTypePlat(id: string) {
  return TYPES_PLAT.find((type) => type.id === id)?.label ?? id;
}

export function indexService(id: string) {
  return SERVICES.findIndex((service) => service.id === id);
}
