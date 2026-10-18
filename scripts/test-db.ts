import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { creerConnexion } from "../lib/db/connection";
import { semerCentre } from "../lib/db/seed";
import { viderRepas, effacerRepas } from "../lib/ecritures";
import * as s from "../lib/db/schema";

// Explicit opt-in: never fall back to the application's database.
async function main() {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL doit viser une base de test migrée.");
  const { db, pool } = creerConnexion(process.env.DATABASE_TEST_URL);
  const rollback = new Error("rollback du test");
  try {
    await db.transaction(async (tx) => {
      const centre = { id: crypto.randomUUID(), slug: crypto.randomUUID(), nom: "Test" };
      await semerCentre(tx, centre);
      const avant = await tx.select().from(s.grammages).where(eq(s.grammages.centreId, centre.id));
      assert.ok(avant.length > 0);
      await tx.update(s.grammages).set({ retenuEnfant: 123.456 }).where(eq(s.grammages.id, avant[0].id));
      await semerCentre(tx, centre);
      const apres = await tx.select().from(s.grammages).where(eq(s.grammages.centreId, centre.id));
      assert.equal(apres.length, avant.length);
      assert.equal(apres.find((g) => g.id === avant[0].id)?.retenuEnfant, 123.456);
      const ids = Array.from({ length: 10 }, () => crypto.randomUUID());
      await tx.insert(s.sejours).values({ id: ids[0], centreId: centre.id, dateDebut: "2026-10-18", dateFin: "2026-10-19", repasDebut: "dejeuner", repasFin: "diner" });
      await tx.insert(s.repas).values({ id: ids[1], sejourId: ids[0], date: "2026-10-18", service: "dejeuner" });
      await tx.insert(s.plats).values({ id: ids[2], repasId: ids[1], nom: "Riz", type: "accompagnement" });
      await tx.insert(s.produitsStock).values({ id: ids[3], centreId: centre.id, nom: "Riz", nomNormalise: "riz", uniteBase: "kg" });
      await tx.insert(s.ingredients).values({ id: ids[4], platId: ids[2], nom: "Riz", grammageCle: "feculents", produitStockId: ids[3] });
      await tx.insert(s.effectifs).values({ id: ids[5], sejourId: ids[0], tranche: "enfant", nombre: 10 });
      await tx.insert(s.absences).values({ id: ids[6], repasId: ids[1], tranche: "enfant", nombre: 2 });
      await tx.insert(s.commandes).values({ id: ids[7], centreId: centre.id, fournisseur: "Test", fichierNom: "test.pdf", creeLe: new Date().toISOString() });
      await tx.insert(s.lignesCommande).values({ id: ids[8], commandeId: ids[7], nomProduit: "Riz", quantite: 5.125, unite: "kg", confiance: 0.9, statut: "valide", produitStockId: ids[3] });
      await tx.insert(s.mouvements).values({ id: ids[9], produitId: ids[3], type: "repas", quantite: 1.125, date: "2026-10-18", repasId: ids[1], ingredientId: ids[4] });
      await tx.update(s.ingredients).set({ quantiteConfirmee: 1.125 }).where(eq(s.ingredients.id, ids[4]));
      await tx.update(s.repas).set({ confirmeLe: new Date().toISOString() }).where(eq(s.repas.id, ids[1]));
      const [ingredient] = await tx.select().from(s.ingredients).where(eq(s.ingredients.id, ids[4]));
      assert.equal(ingredient.quantiteConfirmee, 1.125);
      await viderRepas(tx, ids[1]);
      assert.equal((await tx.select().from(s.ingredients).where(eq(s.ingredients.id, ids[4]))).length, 0);
      assert.equal((await tx.select().from(s.mouvements).where(eq(s.mouvements.id, ids[9]))).length, 0);
      assert.equal((await tx.select().from(s.repas).where(eq(s.repas.id, ids[1])))[0].confirmeLe, null);
      await effacerRepas(tx, ids[1]);
      assert.equal((await tx.select().from(s.absences).where(eq(s.absences.id, ids[6]))).length, 0);
      assert.equal((await tx.select().from(s.repas).where(eq(s.repas.id, ids[1]))).length, 0);
      const security = await tx.execute(sql`SELECT c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
        has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'`);
      assert.equal(security.rows.length, 12);
      for (const row of security.rows) {
        assert.equal(row.relrowsecurity, true);
        assert.equal(row.anon_access, false);
        assert.equal(row.authenticated_access, false);
      }
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
    console.log("OK : 12 tables, initialisation, quantités, suppression de repas et accès API. Données de test annulées.");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("Échec du test PostgreSQL. Vérifier la connexion et les migrations de la base de test.");
  process.exitCode = 1;
});
