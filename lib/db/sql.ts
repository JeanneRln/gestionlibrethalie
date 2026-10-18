export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS centres (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sejours (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  repas_debut TEXT NOT NULL,
  repas_fin TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS repas (
  id TEXT PRIMARY KEY,
  sejour_id TEXT NOT NULL,
  date TEXT NOT NULL,
  service TEXT NOT NULL,
  confirme_le TEXT,
  UNIQUE (sejour_id, date, service)
);
CREATE TABLE IF NOT EXISTS plats (
  id TEXT PRIMARY KEY,
  repas_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS produits_stock (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  nom_normalise TEXT NOT NULL,
  unite_base TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  plat_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  grammage_cle TEXT NOT NULL,
  produit_stock_id TEXT,
  quantite_confirmee REAL
);
CREATE TABLE IF NOT EXISTS effectifs (
  id TEXT PRIMARY KEY,
  sejour_id TEXT NOT NULL,
  tranche TEXT NOT NULL,
  nombre INTEGER NOT NULL DEFAULT 0,
  UNIQUE (sejour_id, tranche)
);
CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY,
  repas_id TEXT NOT NULL,
  tranche TEXT NOT NULL,
  nombre INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repas_id, tranche)
);
CREATE TABLE IF NOT EXISTS grammages (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  cle TEXT NOT NULL,
  service_groupe TEXT NOT NULL,
  libelle TEXT NOT NULL,
  unite TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  base_enfant REAL NOT NULL,
  base_ado REAL NOT NULL,
  base_adulte REAL NOT NULL,
  retenu_enfant REAL NOT NULL,
  retenu_ado REAL NOT NULL,
  retenu_adulte REAL NOT NULL,
  UNIQUE (centre_id, cle, service_groupe)
);
CREATE TABLE IF NOT EXISTS commandes (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  date_commande TEXT,
  fichier_nom TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lignes_commande (
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL,
  nom_produit TEXT NOT NULL,
  quantite REAL,
  unite TEXT NOT NULL,
  confiance REAL NOT NULL,
  statut TEXT NOT NULL,
  produit_stock_id TEXT
);
CREATE TABLE IF NOT EXISTS mouvements (
  id TEXT PRIMARY KEY,
  produit_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantite REAL NOT NULL,
  date TEXT NOT NULL,
  repas_id TEXT,
  ligne_commande_id TEXT,
  ingredient_id TEXT
);
`;
