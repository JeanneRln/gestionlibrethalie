import { doublePrecision, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const centres = pgTable("centres", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nom: text("nom").notNull(),
});

export const sejours = pgTable("sejours", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  dateDebut: text("date_debut").notNull(),
  dateFin: text("date_fin").notNull(),
  repasDebut: text("repas_debut").notNull(),
  repasFin: text("repas_fin").notNull(),
}, (table) => [
  index("sejours_centre_id_idx").on(table.centreId)
]);

export const repas = pgTable(
  "repas",
  {
    id: text("id").primaryKey(),
    sejourId: text("sejour_id").notNull(),
    date: text("date").notNull(),
    service: text("service").notNull(),
    confirmeLe: text("confirme_le"),
  },
  (table) => [uniqueIndex("repas_creneau").on(table.sejourId, table.date, table.service)],
);

export const plats = pgTable("plats", {
  id: text("id").primaryKey(),
  repasId: text("repas_id").notNull(),
  nom: text("nom").notNull(),
  type: text("type").notNull(),
  ordre: integer("ordre").notNull().default(0),
}, (table) => [
  index("plats_repas_id_idx").on(table.repasId)
]);

export const produitsStock = pgTable("produits_stock", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  nom: text("nom").notNull(),
  nomNormalise: text("nom_normalise").notNull(),
  uniteBase: text("unite_base").notNull(),
}, (table) => [
  index("produits_stock_centre_id_idx").on(table.centreId)
]);

export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  platId: text("plat_id").notNull(),
  nom: text("nom").notNull(),
  grammageCle: text("grammage_cle").notNull(),
  produitStockId: text("produit_stock_id"),
  quantiteConfirmee: doublePrecision("quantite_confirmee"),
}, (table) => [
  index("ingredients_plat_id_idx").on(table.platId),
  index("ingredients_produit_stock_id_idx").on(table.produitStockId)
]);

export const effectifs = pgTable(
  "effectifs",
  {
    id: text("id").primaryKey(),
    sejourId: text("sejour_id").notNull(),
    tranche: text("tranche").notNull(),
    nombre: integer("nombre").notNull().default(0),
  },
  (table) => [uniqueIndex("effectifs_tranche").on(table.sejourId, table.tranche)],
);

export const absences = pgTable(
  "absences",
  {
    id: text("id").primaryKey(),
    repasId: text("repas_id").notNull(),
    tranche: text("tranche").notNull(),
    nombre: integer("nombre").notNull().default(0),
  },
  (table) => [uniqueIndex("absences_tranche").on(table.repasId, table.tranche)],
);

export const grammages = pgTable(
  "grammages",
  {
    id: text("id").primaryKey(),
    centreId: text("centre_id").notNull(),
    cle: text("cle").notNull(),
    serviceGroupe: text("service_groupe").notNull(),
    libelle: text("libelle").notNull(),
    unite: text("unite").notNull(),
    note: text("note").notNull().default(""),
    baseEnfant: doublePrecision("base_enfant").notNull(),
    baseAdo: doublePrecision("base_ado").notNull(),
    baseAdulte: doublePrecision("base_adulte").notNull(),
    retenuEnfant: doublePrecision("retenu_enfant").notNull(),
    retenuAdo: doublePrecision("retenu_ado").notNull(),
    retenuAdulte: doublePrecision("retenu_adulte").notNull(),
  },
  (table) => [uniqueIndex("grammages_cle").on(table.centreId, table.cle, table.serviceGroupe)],
);

export const commandes = pgTable("commandes", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  fournisseur: text("fournisseur").notNull(),
  dateCommande: text("date_commande"),
  fichierNom: text("fichier_nom").notNull(),
  creeLe: text("cree_le").notNull(),
}, (table) => [
  index("commandes_centre_id_idx").on(table.centreId)
]);

export const lignesCommande = pgTable("lignes_commande", {
  id: text("id").primaryKey(),
  commandeId: text("commande_id").notNull(),
  nomProduit: text("nom_produit").notNull(),
  quantite: doublePrecision("quantite"),
  unite: text("unite").notNull(),
  confiance: doublePrecision("confiance").notNull(),
  statut: text("statut").notNull(),
  produitStockId: text("produit_stock_id"),
}, (table) => [
  index("lignes_commande_commande_id_idx").on(table.commandeId),
  index("lignes_commande_produit_stock_id_idx").on(table.produitStockId)
]);

export const mouvements = pgTable("mouvements", {
  id: text("id").primaryKey(),
  produitId: text("produit_id").notNull(),
  type: text("type").notNull(),
  quantite: doublePrecision("quantite").notNull(),
  date: text("date").notNull(),
  repasId: text("repas_id"),
  ligneCommandeId: text("ligne_commande_id"),
  ingredientId: text("ingredient_id"),
}, (table) => [
  index("mouvements_produit_id_idx").on(table.produitId),
  index("mouvements_repas_id_idx").on(table.repasId),
  index("mouvements_ligne_commande_id_idx").on(table.ligneCommandeId),
  index("mouvements_ingredient_id_idx").on(table.ingredientId)
]);
