import Link from "next/link";
import { confirmerRepas } from "@/actions/stock";
import { Bandeau } from "@/components/Bandeau";
import { DetailQuantite } from "@/components/DetailQuantite";
import { bouton, champ } from "@/components/styles";
import { quantiteTheorique } from "@/lib/calcul";
import { formaterJour, repasEstPasse } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  contenuRepas,
  grammagesDuCentre,
  produitsDuCentre,
  verifierRepasDuCentre,
} from "@/lib/donnees";
import { arrondir } from "@/lib/format";
import { lireAvis } from "@/lib/navigation";
import { presents } from "@/lib/effectifs";
import { estService, libelleService } from "@/lib/services";

export default async function PageMajStock({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string; repasId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { centre: slug, repasId } = await params;
  const { centre, sejour, repas } = await verifierRepasDuCentre(slug, repasId);
  const avis = await lireAvis(searchParams);
  const service = estService(repas.service) ? repas.service : "dejeuner";
  const [{ plats, ingredients }, grammages, produits, inscrits, absences] = await Promise.all([
    contenuRepas(repas.id),
    grammagesDuCentre(centre.id),
    produitsDuCentre(centre.id),
    comptesEffectifs(sejour.id),
    absencesDesRepas([repas.id]),
  ]);
  const compte = presents(inscrits, absences[repas.id] ?? {});
  const portions = grammages.map((ligne) => ({
    cle: ligne.cle,
    serviceGroupe: ligne.serviceGroupe as "repas_principal" | "petit_dej_gouter" | "diner_enfant",
    unite: ligne.unite,
    retenuEnfant: ligne.retenuEnfant,
    retenuAdo: ligne.retenuAdo,
    retenuAdulte: ligne.retenuAdulte,
  }));
  const passe = repasEstPasse(repas.date, service);

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <div>
        <p className="text-sm text-ink/55">
          <Link href={`/centres/${centre.slug}/stock`} className="hover:underline">
            Stock
          </Link>
        </p>
        <h2 className="font-serif text-3xl">
          {libelleService(service)} · {formaterJour(repas.date)}
        </h2>
        <p className="mt-1 text-sm text-ink/70">
          {passe ? "Ce repas est passé." : "Ce repas n'est pas encore passé."} Les quantités sont préremplies avec les portions prévues. Ajustez-les, rattachez chaque ingrédient à un produit, puis enregistrez.
          {repas.confirmeLe ? " Une nouvelle validation remplace la précédente." : ""}
        </p>
      </div>
      <form action={confirmerRepas} className="space-y-4">
        <input type="hidden" name="slug" value={centre.slug} />
        <input type="hidden" name="repasId" value={repas.id} />
        {ingredients.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink/70">
            Aucun ingrédient sur ce repas. Vous pouvez quand même le marquer comme traité, ou{" "}
            <Link href={`/centres/${centre.slug}/menus/${repas.id}`} className="font-semibold text-accent">
              ajouter des plats
            </Link>
            .
          </p>
        ) : null}
        {plats.map((plat) => {
          const lignes = ingredients.filter((ingredient) => ingredient.platId === plat.id);
          if (lignes.length === 0) return null;
          return (
            <fieldset key={plat.id} className="space-y-3 rounded-2xl border border-line bg-card p-5">
              <legend className="px-1 font-serif text-xl">{plat.nom}</legend>
              {lignes.map((ingredient) => {
                const quantite = quantiteTheorique(ingredient.grammageCle, service, compte, portions);
                const defaut = ingredient.quantiteConfirmee ?? (quantite ? arrondir(quantite.total) : 0);
                return (
                  <div key={ingredient.id} className="grid gap-3 border-t border-line pt-3 lg:grid-cols-[1fr_10rem_14rem]">
                    <div>
                      <p className="font-medium">{ingredient.nom}</p>
                      {quantite ? (
                        <DetailQuantite
                          presents={compte}
                          portions={quantite.portions}
                          unite={quantite.unite}
                          total={quantite.total}
                        />
                      ) : (
                        <p className="text-sm text-danger">Famille de grammage inconnue. Corrigez-la dans le menu.</p>
                      )}
                    </div>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">Quantité réelle ({quantite?.unite === "piece" ? "pièces" : quantite?.unite === "ml" ? "ml" : "g"})</span>
                      <input className={champ} type="number" min={0} step="0.01" name={`q_${ingredient.id}`} defaultValue={defaut} />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">Produit du stock</span>
                      <select className={champ} name={`p_${ingredient.id}`} defaultValue={ingredient.produitStockId ?? ""}>
                        <option value="">Choisir</option>
                        {produits.map((produit) => (
                          <option key={produit.id} value={produit.id}>
                            {produit.nom}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </fieldset>
          );
        })}
        <button className={bouton} type="submit">
          Enregistrer les quantités
        </button>
      </form>
    </div>
  );
}
