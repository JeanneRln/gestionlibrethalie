export type ServiceGroupe = "repas_principal" | "petit_dej_gouter" | "diner_enfant";
export type UniteGrammage = "g" | "ml" | "piece";

export type GrammageBase = {
  cle: string;
  serviceGroupe: ServiceGroupe;
  libelle: string;
  unite: UniteGrammage;
  note: string;
  baseEnfant: number;
  baseAdo: number;
  baseAdulte: number;
};

function ligne(
  cle: string,
  serviceGroupe: ServiceGroupe,
  libelle: string,
  unite: UniteGrammage,
  baseEnfant: number,
  baseAdo: number,
  baseAdulte: number,
  note: string,
): GrammageBase {
  return { cle, serviceGroupe, libelle, unite, note, baseEnfant, baseAdo, baseAdulte };
}

const repasPrincipal: GrammageBase[] = [
  ligne("pain", "repas_principal", "Pain", "g", 40, 50, 100, "Repas principal. Élémentaire 40 g ; ados et adultes 50 à 100 g."),
  ligne("crudites", "repas_principal", "Crudités", "g", 60, 80, 100, "Repère : salade composée de crudités. Élémentaire 60 g ; ados et adultes 80 à 100 g."),
  ligne("legumes_cuits", "repas_principal", "Légumes cuits", "g", 100, 150, 150, "Légumes cuits. Élémentaire 100 g ; ados et adultes 150 g."),
  ligne("feculents", "repas_principal", "Féculents cuits", "g", 170, 200, 250, "Riz, pâtes, pommes de terre. Élémentaire 170 g ; ados et adultes 200 à 250 g."),
  ligne("viande", "repas_principal", "Viande", "g", 70, 100, 120, "Repère : bœuf braisé ou sauté, sans sauce. Élémentaire 70 g ; ados et adultes 100 à 120 g."),
  ligne("poisson", "repas_principal", "Poisson", "g", 70, 100, 120, "Même barème que la viande braisée : 70 g en élémentaire, 100 à 120 g pour les ados et adultes."),
  ligne("oeuf", "repas_principal", "Œuf", "piece", 1, 1, 1.5, "Œuf dur. Élémentaire 1 ; ados et adultes 1 à 1,5."),
  ligne("charcuterie", "repas_principal", "Charcuterie", "g", 40, 50, 50, "Repère : jambon blanc. Élémentaire 40 g ; ados et adultes 50 g."),
  ligne("preparation", "repas_principal", "Préparation type quiche ou pizza", "g", 150, 200, 200, "Plat pâtissier. Élémentaire 150 g ; ados et adultes 200 g."),
  ligne("potage", "repas_principal", "Potage", "ml", 167, 250, 250, "Potage de légumes : 1/6 L en élémentaire, 1/4 L pour les ados et adultes."),
  ligne("produit_laitier", "repas_principal", "Yaourt ou lait fermenté", "g", 100, 100, 125, "Fourchette 100 à 125 g. La base est le bas de fourchette, l'adulte est au haut."),
  ligne("petit_suisse", "repas_principal", "Petit-suisse", "g", 50, 100, 120, "Élémentaire 50 à 60 g ; ados et adultes 100 à 120 g."),
  ligne("fromage", "repas_principal", "Fromage", "g", 16, 16, 40, "Élémentaire 16 à 30 g ; ados et adultes 16 à 40 g. Bases au bas de fourchette, à augmenter si besoin."),
  ligne("lait_repas", "repas_principal", "Lait du repas", "ml", 125, 250, 250, "Menus à quatre composantes. 250 ml pour les adolescents et les adultes."),
  ligne("fruit", "repas_principal", "Fruit", "g", 100, 100, 150, "Fruit cru ou cuit. Élémentaire 100 g ; ados et adultes 100 à 150 g."),
  ligne("matiere_grasse", "repas_principal", "Matière grasse", "g", 7, 8, 8, "Sauce ou assaisonnement, poids de matière grasse. Élémentaire 7 g ; ados et adultes 8 g."),
];

const petitDejeuner: GrammageBase[] = [
  ligne("pain_pd", "petit_dej_gouter", "Pain", "g", 50, 80, 80, "Petit-déjeuner ou goûter. Élémentaire 50 g ; ados et adultes 80 g."),
  ligne("cereales", "petit_dej_gouter", "Céréales", "g", 40, 50, 60, "Élémentaire 40 à 45 g ; ados et adultes 50 à 60 g."),
  ligne("biscuits", "petit_dej_gouter", "Biscuits", "g", 30, 50, 50, "Pâtisserie sèche. Élémentaire 30 g ; ados et adultes 50 g."),
  ligne("patisserie", "petit_dej_gouter", "Pâtisserie type quatre-quarts", "g", 40, 60, 80, "Élémentaire 40 à 60 g ; ados et adultes 60 à 80 g."),
  ligne("confiture", "petit_dej_gouter", "Confiture, miel ou chocolat", "g", 20, 30, 30, "Élémentaire 20 g ; ados et adultes 30 g."),
  ligne("fruit_pd", "petit_dej_gouter", "Fruit", "g", 100, 100, 150, "Petit-déjeuner ou goûter. Élémentaire 100 g ; ados et adultes 100 à 150 g."),
  ligne("fruit_sec", "petit_dej_gouter", "Fruits secs", "g", 20, 30, 30, "Élémentaire 20 g ; ados et adultes 30 g."),
  ligne("lait_petit_dejeuner", "petit_dej_gouter", "Lait du petit-déjeuner", "ml", 200, 250, 250, "Élémentaire 200 ml ; ados et adultes 250 ml."),
  ligne("lait_gouter", "petit_dej_gouter", "Lait du goûter", "ml", 125, 250, 250, "Élémentaire 125 ml ; ados et adultes 250 ml."),
  ligne("jus", "petit_dej_gouter", "Jus de fruit", "ml", 125, 200, 200, "Pur jus. Élémentaire 125 ml ; ados et adultes 200 ml."),
  ligne("yaourt", "petit_dej_gouter", "Yaourt", "g", 100, 100, 125, "Fourchette 100 à 125 g."),
  ligne("fromage_blanc", "petit_dej_gouter", "Fromage blanc", "g", 90, 90, 120, "Fourchette 90 à 120 g."),
  ligne("fromage_pd", "petit_dej_gouter", "Fromage", "g", 16, 16, 40, "Élémentaire 16 à 30 g ; ados et adultes 16 à 40 g."),
  ligne("beurre", "petit_dej_gouter", "Beurre", "g", 8, 16, 16, "Élémentaire 8 g ; ados et adultes 16 g."),
];

const noteDiner =
  "L'annexe GEMRCN de juillet 2015 demande un dîner spécifique pour les 7-10 ans : moins de protéines, plus de légumes, de féculents, de produit laitier et de fruit. Elle ne publie pas de second tableau chiffré. La portion de départ reprend le déjeuner élémentaire et peut être augmentée.";

const dinerEnfant: GrammageBase[] = repasPrincipal
  .filter((ligneGrammage) =>
    ["viande", "poisson", "oeuf", "charcuterie", "legumes_cuits", "feculents", "produit_laitier", "fromage", "fruit"].includes(
      ligneGrammage.cle,
    ),
  )
  .map((ligneGrammage) =>
    ligne(
      ligneGrammage.cle,
      "diner_enfant",
      `${ligneGrammage.libelle} — dîner 7-10 ans`,
      ligneGrammage.unite,
      ligneGrammage.baseEnfant,
      ligneGrammage.baseEnfant,
      ligneGrammage.baseEnfant,
      noteDiner,
    ),
  );

export const GRAMMAGES: GrammageBase[] = [...repasPrincipal, ...petitDejeuner, ...dinerEnfant];

export const CLES_GRAMMAGE = [...new Set(GRAMMAGES.filter((g) => g.serviceGroupe !== "diner_enfant").map((g) => g.cle))];

export function clesPourSelect() {
  return GRAMMAGES.filter((g) => g.serviceGroupe !== "diner_enfant").map((g) => ({
    cle: g.cle,
    libelle: g.libelle,
    groupe: g.serviceGroupe === "petit_dej_gouter" ? "Petit-déjeuner et goûter" : "Repas principal",
  }));
}

export function decrireCles() {
  return clesPourSelect()
    .map((cle) => {
      const source = GRAMMAGES.find((g) => g.cle === cle.cle && g.serviceGroupe !== "diner_enfant");
      return `- ${cle.cle} (${cle.groupe}) : ${cle.libelle}. ${source?.note ?? ""}`;
    })
    .join("\n");
}

export const GROUPES_GRAMMAGE: { id: ServiceGroupe; titre: string; texte: string }[] = [
  {
    id: "repas_principal",
    titre: "Déjeuner, et dîner des ados et adultes",
    texte: "Portions du repas principal. Pour les ados et les adultes, le bas de la fourchette officielle est la portion ado, le haut est la portion adulte.",
  },
  {
    id: "petit_dej_gouter",
    titre: "Petit-déjeuner et goûter",
    texte: "Ces portions servent au petit-déjeuner et au goûter. Le lait du goûter a sa propre ligne.",
  },
  {
    id: "diner_enfant",
    titre: "Dîner des 7-10 ans",
    texte: "Seule la portion enfant change au dîner. Les ados et les adultes gardent la portion du repas principal.",
  },
];
