import Link from "next/link";
import { ajouterProduit, ajusterStock } from "@/actions/stock";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, champ } from "@/components/styles";
import { chaqueJour, formaterJourCourt } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  grammagesDuCentre,
  ingredientsDesPlats,
  mouvementsDuCentre,
  platsDesRepas,
  produitsDuCentre,
  repasAConfirmer,
  repasDuSejour,
  resoudreCentre,
  sejourDuCentre,
} from "@/lib/donnees";
import { formaterQuantite } from "@/lib/format";
import { lireAvis } from "@/lib/navigation";
import { construireProjection, stockReel } from "@/lib/projection";
import { estService, libelleService, type ServiceId } from "@/lib/services";
import { UNITES_COMMANDE } from "@/lib/unites";

export default async function PageStock({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const centre = await resoudreCentre(params);
  const avis = await lireAvis(searchParams);
  const [produits, mouvementsListe, sejour, aConfirmer] = await Promise.all([
    produitsDuCentre(centre.id),
    mouvementsDuCentre(centre.id),
    sejourDuCentre(centre.id),
    repasAConfirmer(centre.id),
  ]);
  const mouvements = mouvementsListe.map((mouvement) => ({
    produitId: mouvement.produitId,
    type: mouvement.type,
    quantite: mouvement.quantite,
    date: mouvement.date,
    repasId: mouvement.repasId,
    ingredientId: mouvement.ingredientId,
  }));

  let jours: ReturnType<typeof construireProjection> = [];
  if (sejour) {
    const liste = await repasDuSejour(sejour.id);
    const plats = await platsDesRepas(liste.map((item) => item.id));
    const ingredients = await ingredientsDesPlats(plats.map((plat) => plat.id));
    const grammages = await grammagesDuCentre(centre.id);
    const inscrits = await comptesEffectifs(sejour.id);
    const absences = await absencesDesRepas(liste.map((item) => item.id));
    jours = construireProjection({
      jours: chaqueJour(sejour.dateDebut, sejour.dateFin),
      produits,
      mouvements,
      repas: liste.flatMap((item) =>
        estService(item.service) ? [{ id: item.id, date: item.date, service: item.service, confirmeLe: item.confirmeLe }] : [],
      ),
      ingredients: ingredients.flatMap((ingredient) => {
        const plat = plats.find((item) => item.id === ingredient.platId);
        if (!plat) return [];
        return [
          {
            id: ingredient.id,
            repasId: plat.repasId,
            nom: ingredient.nom,
            grammageCle: ingredient.grammageCle,
            produitStockId: ingredient.produitStockId,
          },
        ];
      }),
      grammages: grammages.map((ligne) => ({
        cle: ligne.cle,
        serviceGroupe: ligne.serviceGroupe as "repas_principal" | "petit_dej_gouter" | "diner_enfant",
        unite: ligne.unite,
        retenuEnfant: ligne.retenuEnfant,
        retenuAdo: ligne.retenuAdo,
        retenuAdulte: ligne.retenuAdulte,
      })),
      inscrits,
      absences,
    });
  }

  const aujourdHui = jours.find((jour) => jour.repas.some((repas) => repas.passe && !repas.confirme));
  const choisi = jours.find((jour) => jour.date === avis.jour) ?? aujourdHui ?? jours[0];

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          {aConfirmer.length > 0 ? (
            <section className="rounded-2xl bg-warnbg p-5">
              <h2 className="font-serif text-2xl text-warn">Quantités à régulariser</h2>
              <p className="mt-2 text-sm text-ink/70">
                {aConfirmer.length} repas sont passés. Choisissez le moment, puis corrigez seulement les quantités sorties.
              </p>
              <Link href={`/centres/${centre.slug}/stock/point`} className={`${bouton} mt-3`}>
                Régulariser
              </Link>
            </section>
          ) : (
            <section className="rounded-2xl border border-line bg-card p-5">
              <h2 className="font-serif text-2xl">Quantités à régulariser</h2>
              <p className="mt-2 text-sm text-ink/70">
                Choisissez le moment, puis indiquez les quantités sorties pour les repas déjà passés.
              </p>
              <Link href={`/centres/${centre.slug}/stock/point`} className={`${bouton} mt-3`}>
                Régulariser
              </Link>
            </section>
          )}
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-serif text-3xl">Stock à ce jour</h2>
            <p className="mt-2 text-sm text-ink/70">
              Entrées des commandes validées, sorties des repas confirmés, et ajustements d'inventaire.
            </p>
            <form action={ajouterProduit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
              <input type="hidden" name="slug" value={centre.slug} />
              <input className={champ} name="nom" placeholder="Produit déjà en stock" required />
              <input className={champ} type="number" min={0} step="0.01" name="quantite" placeholder="Quantité" required />
              <select className={champ} name="unite" defaultValue="kg" aria-label="Unité">
                {UNITES_COMMANDE.filter((unite) => unite.id !== "colis").map((unite) => (
                  <option key={unite.id} value={unite.id}>
                    {unite.label}
                  </option>
                ))}
              </select>
              <button className={bouton} type="submit">
                Ajouter
              </button>
            </form>
          </section>

          {produits.length === 0 ? <p className="text-sm text-ink/65">Le stock est vide.</p> : null}
          <ul className="space-y-3">
            {produits.map((produit) => {
              const quantite = stockReel(mouvements, produit.id);
              const saisie = uniteSaisie(produit.uniteBase);
              return (
                <li key={produit.id} className="rounded-2xl border border-line bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{produit.nom}</h3>
                    <p className={`font-serif text-2xl ${quantite < 0 ? "text-danger" : ""}`}>
                      {formaterQuantite(quantite, produit.uniteBase)}
                    </p>
                  </div>
                  <form action={ajusterStock} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="slug" value={centre.slug} />
                    <input type="hidden" name="produitId" value={produit.id} />
                    <label className="text-sm">
                      <span className="mb-1 block text-ink/60">Quantité réelle ({saisie.label})</span>
                      <input
                        className={`${champ} w-32`}
                        type="number"
                        min={0}
                        step="0.01"
                        name="quantite"
                        defaultValue={Math.round((quantite / saisie.facteur) * 1000) / 1000}
                      />
                    </label>
                    <button className={boutonSecondaire} type="submit">
                      Ajuster
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="w-full shrink-0 rounded-2xl border border-line bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-80 lg:overflow-y-auto">
          <h2 className="font-serif text-2xl">Projection</h2>
          <p className="mt-1 text-sm text-ink/60">
            Jour par jour. Les livraisons du jour sont comptées avant les repas. Les repas confirmés utilisent les quantités réelles, les autres les portions prévues.
          </p>
          {jours.length === 0 ? (
            <p className="mt-4 text-sm text-ink/60">Créez un séjour pour projeter le stock.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-1">
                {jours.map((jour) => {
                  const actif = jour.date === choisi?.date;
                  const alerte = jour.repas.some((repas) => repas.passe && !repas.confirme);
                  return (
                    <li key={jour.date}>
                      <Link
                        href={`/centres/${centre.slug}/stock?jour=${jour.date}`}
                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${actif ? "bg-foam font-semibold" : "hover:bg-paper"}`}
                        aria-current={actif ? "page" : undefined}
                      >
                        {formaterJourCourt(jour.date)}
                        {alerte ? <span className="text-xs text-warn">à confirmer</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {choisi ? (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  {choisi.repas.map((repas) => (
                    <div key={repas.id} className="text-sm">
                      <Link href={`/centres/${centre.slug}/stock/${repas.id}`} className="font-semibold hover:underline">
                        {libelleService(repas.service)}
                      </Link>
                      <span className="ml-2 text-xs text-ink/50">
                        {repas.confirme ? "confirmé" : repas.passe ? "à confirmer" : "à venir"}
                      </span>
                      {repas.nonRattaches.length > 0 ? (
                        <p className="text-xs text-warn">Non rattaché : {repas.nonRattaches.join(", ")}</p>
                      ) : null}
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-ink/45 uppercase">Fin de journée</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {choisi.stocks.map((ligne) => {
                        const produit = produits.find((item) => item.id === ligne.produitId);
                        if (!produit) return null;
                        return (
                          <li key={ligne.produitId} className="flex justify-between gap-2">
                            <span>{produit.nom}</span>
                            <span className={ligne.quantite < 0 ? "text-danger" : ""}>
                              {formaterQuantite(ligne.quantite, produit.uniteBase)}
                            </span>
                          </li>
                        );
                      })}
                      {choisi.stocks.length === 0 ? <li className="text-ink/50">Aucun produit.</li> : null}
                    </ul>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function uniteSaisie(uniteBase: string) {
  if (uniteBase === "ml") return { label: "L", facteur: 1000 };
  if (uniteBase === "piece") return { label: "pièces", facteur: 1 };
  return { label: "kg", facteur: 1000 };
}
