-- Tables accessed only by the Next.js server; no public API policies.
CREATE TABLE public.centres (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL
);
CREATE TABLE public.sejours (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  date_debut TEXT NOT NULL,
  date_fin TEXT NOT NULL,
  repas_debut TEXT NOT NULL,
  repas_fin TEXT NOT NULL
);
CREATE TABLE public.repas (
  id TEXT PRIMARY KEY,
  sejour_id TEXT NOT NULL,
  date TEXT NOT NULL,
  service TEXT NOT NULL,
  confirme_le TEXT,
  UNIQUE (sejour_id, date, service)
);
CREATE TABLE public.plats (
  id TEXT PRIMARY KEY,
  repas_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE public.produits_stock (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  nom_normalise TEXT NOT NULL,
  unite_base TEXT NOT NULL
);
CREATE TABLE public.ingredients (
  id TEXT PRIMARY KEY,
  plat_id TEXT NOT NULL,
  nom TEXT NOT NULL,
  grammage_cle TEXT NOT NULL,
  produit_stock_id TEXT,
  quantite_confirmee DOUBLE PRECISION
);
CREATE TABLE public.effectifs (
  id TEXT PRIMARY KEY,
  sejour_id TEXT NOT NULL,
  tranche TEXT NOT NULL,
  nombre INTEGER NOT NULL DEFAULT 0,
  UNIQUE (sejour_id, tranche)
);
CREATE TABLE public.absences (
  id TEXT PRIMARY KEY,
  repas_id TEXT NOT NULL,
  tranche TEXT NOT NULL,
  nombre INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repas_id, tranche)
);
CREATE TABLE public.grammages (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  cle TEXT NOT NULL,
  service_groupe TEXT NOT NULL,
  libelle TEXT NOT NULL,
  unite TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  base_enfant DOUBLE PRECISION NOT NULL,
  base_ado DOUBLE PRECISION NOT NULL,
  base_adulte DOUBLE PRECISION NOT NULL,
  retenu_enfant DOUBLE PRECISION NOT NULL,
  retenu_ado DOUBLE PRECISION NOT NULL,
  retenu_adulte DOUBLE PRECISION NOT NULL,
  UNIQUE (centre_id, cle, service_groupe)
);
CREATE TABLE public.commandes (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  fournisseur TEXT NOT NULL,
  date_commande TEXT,
  fichier_nom TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE TABLE public.lignes_commande (
  id TEXT PRIMARY KEY,
  commande_id TEXT NOT NULL,
  nom_produit TEXT NOT NULL,
  quantite DOUBLE PRECISION,
  unite TEXT NOT NULL,
  confiance DOUBLE PRECISION NOT NULL,
  statut TEXT NOT NULL,
  produit_stock_id TEXT
);
CREATE TABLE public.mouvements (
  id TEXT PRIMARY KEY,
  produit_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantite DOUBLE PRECISION NOT NULL,
  date TEXT NOT NULL,
  repas_id TEXT,
  ligne_commande_id TEXT,
  ingredient_id TEXT
);

CREATE INDEX sejours_centre_id_idx ON public.sejours (centre_id);
CREATE INDEX plats_repas_id_idx ON public.plats (repas_id);
CREATE INDEX produits_stock_centre_id_idx ON public.produits_stock (centre_id);
CREATE INDEX ingredients_plat_id_idx ON public.ingredients (plat_id);
CREATE INDEX ingredients_produit_stock_id_idx ON public.ingredients (produit_stock_id);
CREATE INDEX commandes_centre_id_idx ON public.commandes (centre_id);
CREATE INDEX lignes_commande_commande_id_idx ON public.lignes_commande (commande_id);
CREATE INDEX lignes_commande_produit_stock_id_idx ON public.lignes_commande (produit_stock_id);
CREATE INDEX mouvements_produit_id_idx ON public.mouvements (produit_id);
CREATE INDEX mouvements_repas_id_idx ON public.mouvements (repas_id);
CREATE INDEX mouvements_ligne_commande_id_idx ON public.mouvements (ligne_commande_id);
CREATE INDEX mouvements_ingredient_id_idx ON public.mouvements (ingredient_id);

ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.centres FROM PUBLIC, anon, authenticated;
ALTER TABLE public.sejours ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sejours FROM PUBLIC, anon, authenticated;
ALTER TABLE public.repas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.repas FROM PUBLIC, anon, authenticated;
ALTER TABLE public.plats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.plats FROM PUBLIC, anon, authenticated;
ALTER TABLE public.produits_stock ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.produits_stock FROM PUBLIC, anon, authenticated;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ingredients FROM PUBLIC, anon, authenticated;
ALTER TABLE public.effectifs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.effectifs FROM PUBLIC, anon, authenticated;
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.absences FROM PUBLIC, anon, authenticated;
ALTER TABLE public.grammages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.grammages FROM PUBLIC, anon, authenticated;
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commandes FROM PUBLIC, anon, authenticated;
ALTER TABLE public.lignes_commande ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lignes_commande FROM PUBLIC, anon, authenticated;
ALTER TABLE public.mouvements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mouvements FROM PUBLIC, anon, authenticated;
