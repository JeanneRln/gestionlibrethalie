import Link from "next/link";
import { confirmerAvant } from "@/actions/stock";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, champ } from "@/components/styles";
import { formaterJour } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  grammagesDuCentre,
  ingredientsDesPlats,
  platsDesRepas,
  produitsDuCentre,
  repasDuSejour,
  resoudreCentre,
  sejourDuCentre,
} from "@/lib/donnees";
import { formaterPortion } from "@/lib/format";
import { lireAvis } from "@/lib/navigation";
import { assemblerLignes, grouperConsommes, lireMoment, repasDuMoment, saisieRegulation } from "@/lib/pointStock";
import { uniteCompatible } from "@/lib/unites";
import { estService, libelleService } from "@/lib/services";

export default async function PagePointStock({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const centre = await resoudreCentre(params);
  const avis = await lireAvis(searchParams);
  const query = await searchParams;
  const sejour = await sejourDuCentre(centre.id);
  const liste = sejour ? await repasDuSejour(sejour.id) : [];
  const moment = lireMoment(typeof query.moment === "string" ? query.moment : "");
  const limite = moment ? liste.find((repas) => repas.id === moment.repasId) : undefined;
  const momentValide = moment && limite ? moment : null;
  const cibles = momentValide ? repasDuMoment(liste, momentValide) : [];

  const plats = momentValide ? await platsDesRepas(cibles.map((repas) => repas.id)) : [];
  const ingredients = await ingredientsDesPlats(plats.map((plat) => plat.id));
  const grammages = sejour && momentValide ? await grammagesDuCentre(centre.id) : [];
  const produits = await produitsDuCentre(centre.id);
  const groupes = sejour && momentValide
    ? grouperConsommes(
        assemblerLignes({
          repas: cibles,
          plats,
          ingredients,
          grammages: grammages.map((ligne) => ({
            cle: ligne.cle,
            serviceGroupe: ligne.serviceGroupe as "repas_principal" | "petit_dej_gouter" | "diner_enfant",
            unite: ligne.unite,
            retenuEnfant: ligne.retenuEnfant,
            retenuAdo: ligne.retenuAdo,
            retenuAdulte: ligne.retenuAdulte,
          })),
          inscrits: await comptesEffectifs(sejour.id),
          absences: await absencesDesRepas(cibles.map((repas) => repas.id)),
          produits,
        }),
        produits,
      )
    : [];
  const reglables = groupes.flatMap((groupe) => {
    const produit = produits.find((item) => item.id === groupe.produitStockId);
    return produit ? [{ groupe, produit }] : [];
  });
  const laisses = groupes.filter((groupe) => !groupe.produitStockId).map((groupe) => groupe.titre);

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <div>
        <p className="text-sm text-ink/55">
          <Link href={`/centres/${centre.slug}/stock`} className="hover:underline">
            Stock
          </Link>
        </p>
        <h2 className="font-serif text-3xl">Mettre à jour le stock</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Choisissez où vous en êtes. Ensuite, indiquez seulement les quantités à sortir du stock pour les repas déjà passés.
        </p>
      </div>

      {liste.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink/70">Créez d'abord le séjour.</p>
      ) : (
        <form action={`/centres/${centre.slug}/stock/point`} method="get" className="grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Où en êtes-vous ?</span>
            <select className={champ} name="moment" defaultValue={momentValide ? `${momentValide.cote}:${momentValide.repasId}` : ""} required>
              <option value="" disabled>
                Choisir un moment
              </option>
              {liste.flatMap((repas) =>
                (["avant", "apres"] as const).map((cote) => (
                  <option key={`${cote}-${repas.id}`} value={`${cote}:${repas.id}`}>
                    {libelleMoment(cote, repas.service, repas.date)}
                  </option>
                )),
              )}
            </select>
          </label>
          <button className={boutonSecondaire} type="submit">
            Voir les quantités
          </button>
        </form>
      )}

      {momentValide && limite ? (
        <form action={confirmerAvant} className="space-y-4">
          <input type="hidden" name="slug" value={centre.slug} />
          <input type="hidden" name="moment" value={`${momentValide.cote}:${momentValide.repasId}`} />
          <section className="rounded-2xl border border-line bg-card p-5">
            <h3 className="font-serif text-2xl">{libelleMoment(momentValide.cote, limite.service, limite.date)}</h3>
            <p className="mt-2 text-sm text-ink/70">
              Corrigez la quantité si le menu n'a pas été suivi. Le chiffre déjà inscrit est celui prévu pour ces repas.
            </p>
            {cibles.length === 0 ? (
              <p className="mt-3 text-sm text-ink/70">Aucun repas à actualiser pour ce moment.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {cibles.map((repas) => (
                  <li key={repas.id} className="rounded-full bg-paper px-3 py-1 text-sm">
                    {estService(repas.service) ? libelleService(repas.service) : repas.service} · {formaterJour(repas.date)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {reglables.length === 0 && cibles.length > 0 ? (
            <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink/70">
              Aucune quantité à régulariser : ces repas n'ont pas de produit relié au stock.
            </p>
          ) : null}

          {reglables.map(({ groupe, produit }, index) => {
            const saisie = saisieRegulation(groupe.unite, groupe.theorique, produit.uniteBase, produit.nom);
            const memeUnite = uniteCompatible(groupe.unite, produit.uniteBase);
            return (
              <fieldset key={groupe.cle} className="rounded-2xl border border-line bg-card p-5">
                <legend className="px-1 font-serif text-xl">{groupe.titre}</legend>
                <input type="hidden" name={`ids_${index}`} value={groupe.lignes.map((ligne) => ligne.ingredientId).join(",")} />
                <p className="text-sm text-ink/65">
                  {groupe.plats.join(", ")}
                  {memeUnite ? "" : ` · portion prévue ${formaterPortion(groupe.theorique, groupe.unite)}`}
                </p>
                <label className="mt-3 block max-w-xs text-sm">
                  <span className="mb-1 block text-ink/60">Quantité à régulariser ({saisie.label})</span>
                  <input className={champ} type="number" min={0} step="0.01" name={`q_${index}`} defaultValue={saisie.valeur} />
                </label>
              </fieldset>
            );
          })}

          {laisses.length > 0 ? (
            <p className="text-sm text-ink/55">
              Sans quantité demandée, faute de produit relié : {laisses.join(", ")}.
            </p>
          ) : null}

          {cibles.length > 0 ? (
            <button className={bouton} type="submit">
              Régulariser le stock
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function libelleMoment(cote: "avant" | "apres", service: string, date: string) {
  const nom = estService(service) ? libelleService(service).toLowerCase() : service;
  const quand = cote === "avant" ? "Avant" : "Après";
  return `${quand} le ${nom} du ${formaterJour(date).toLowerCase()}`;
}
