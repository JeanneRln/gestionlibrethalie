import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const centres = sqliteTable("centres", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nom: text("nom").notNull(),
});

export const sejours = sqliteTable("sejours", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  dateDebut: text("date_debut").notNull(),
  dateFin: text("date_fin").notNull(),
  repasDebut: text("repas_debut").notNull(),
  repasFin: text("repas_fin").notNull(),
});

export const repas = sqliteTable(
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

export const plats = sqliteTable("plats", {
  id: text("id").primaryKey(),
  repasId: text("repas_id").notNull(),
  nom: text("nom").notNull(),
  type: text("type").notNull(),
  ordre: integer("ordre").notNull().default(0),
});

export const produitsStock = sqliteTable("produits_stock", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  nom: text("nom").notNull(),
  nomNormalise: text("nom_normalise").notNull(),
  uniteBase: text("unite_base").notNull(),
});

export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  platId: text("plat_id").notNull(),
  nom: text("nom").notNull(),
  grammageCle: text("grammage_cle").notNull(),
  produitStockId: text("produit_stock_id"),
  quantiteConfirmee: real("quantite_confirmee"),
});

export const effectifs = sqliteTable(
  "effectifs",
  {
    id: text("id").primaryKey(),
    sejourId: text("sejour_id").notNull(),
    tranche: text("tranche").notNull(),
    nombre: integer("nombre").notNull().default(0),
  },
  (table) => [uniqueIndex("effectifs_tranche").on(table.sejourId, table.tranche)],
);

export const absences = sqliteTable(
  "absences",
  {
    id: text("id").primaryKey(),
    repasId: text("repas_id").notNull(),
    tranche: text("tranche").notNull(),
    nombre: integer("nombre").notNull().default(0),
  },
  (table) => [uniqueIndex("absences_tranche").on(table.repasId, table.tranche)],
);

export const grammages = sqliteTable(
  "grammages",
  {
    id: text("id").primaryKey(),
    centreId: text("centre_id").notNull(),
    cle: text("cle").notNull(),
    serviceGroupe: text("service_groupe").notNull(),
    libelle: text("libelle").notNull(),
    unite: text("unite").notNull(),
    note: text("note").notNull().default(""),
    baseEnfant: real("base_enfant").notNull(),
    baseAdo: real("base_ado").notNull(),
    baseAdulte: real("base_adulte").notNull(),
    retenuEnfant: real("retenu_enfant").notNull(),
    retenuAdo: real("retenu_ado").notNull(),
    retenuAdulte: real("retenu_adulte").notNull(),
  },
  (table) => [uniqueIndex("grammages_cle").on(table.centreId, table.cle, table.serviceGroupe)],
);

export const commandes = sqliteTable("commandes", {
  id: text("id").primaryKey(),
  centreId: text("centre_id").notNull(),
  fournisseur: text("fournisseur").notNull(),
  dateCommande: text("date_commande"),
  fichierNom: text("fichier_nom").notNull(),
  creeLe: text("cree_le").notNull(),
});

export const lignesCommande = sqliteTable("lignes_commande", {
  id: text("id").primaryKey(),
  commandeId: text("commande_id").notNull(),
  nomProduit: text("nom_produit").notNull(),
  quantite: real("quantite"),
  unite: text("unite").notNull(),
  confiance: real("confiance").notNull(),
  statut: text("statut").notNull(),
  produitStockId: text("produit_stock_id"),
});

export const mouvements = sqliteTable("mouvements", {
  id: text("id").primaryKey(),
  produitId: text("produit_id").notNull(),
  type: text("type").notNull(),
  quantite: real("quantite").notNull(),
  date: text("date").notNull(),
  repasId: text("repas_id"),
  ligneCommandeId: text("ligne_commande_id"),
  ingredientId: text("ingredient_id"),
});
