import Link from "next/link";
import { ajouterIngredient, ajouterPlat, changerFamille, supprimerIngredient, supprimerPlat } from "@/actions/menu";
import { Bandeau } from "@/components/Bandeau";
import { DetailQuantite } from "@/components/DetailQuantite";
import { SelectFamille } from "@/components/SelectFamille";
import { bouton, boutonSecondaire, boutonTexte, champ } from "@/components/styles";
import { quantiteTheorique } from "@/lib/calcul";
import { formaterJour } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  contenuRepas,
  grammagesDuCentre,
  verifierRepasDuCentre,
} from "@/lib/donnees";
import { presents } from "@/lib/effectifs";
import { lireAvis } from "@/lib/navigation";
import { estService, libelleService, libelleTypePlat, TYPES_PLAT } from "@/lib/services";

export default async function PageRepas({
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
  const [{ plats, ingredients }, grammageLignes, inscrits, absences] = await Promise.all([
    contenuRepas(repas.id),
    grammagesDuCentre(centre.id),
    comptesEffectifs(sejour.id),
    absencesDesRepas([repas.id]),
  ]);
  const compte = presents(inscrits, absences[repas.id] ?? {});
  const portions = grammageLignes.map((ligne) => ({
    cle: ligne.cle,
    serviceGroupe: ligne.serviceGroupe as "repas_principal" | "petit_dej_gouter" | "diner_enfant",
    unite: ligne.unite,
    retenuEnfant: ligne.retenuEnfant,
    retenuAdo: ligne.retenuAdo,
    retenuAdulte: ligne.retenuAdulte,
  }));

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/55">
            <Link href={`/centres/${centre.slug}/menus`} className="hover:underline">
              Grille
            </Link>
          </p>
          <h2 className="font-serif text-3xl">
            {libelleService(service)} · {formaterJour(repas.date)}
          </h2>
          <p className="mt-1 text-sm text-ink/70">
            {compte.enfant} enfants · {compte.ado} ados · {compte.adulte} adultes. Les effectifs se modifient dans l'onglet Effectifs.
          </p>
        </div>
        <Link href={`/centres/${centre.slug}/stock/${repas.id}`} className={boutonSecondaire}>
          Mettre à jour le stock
        </Link>
      </div>

      {plats.length === 0 ? <p className="text-sm text-ink/65">Aucun plat pour l'instant. Ajoutez-en un, ou importez le menu depuis la grille.</p> : null}

      <div className="space-y-4">
        {plats.map((plat) => {
          const lignes = ingredients.filter((ingredient) => ingredient.platId === plat.id);
          return (
            <article key={plat.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink/45 uppercase">{libelleTypePlat(plat.type)}</p>
                  <h3 className="font-serif text-2xl">{plat.nom}</h3>
                </div>
                <form action={supprimerPlat}>
                  <input type="hidden" name="slug" value={centre.slug} />
                  <input type="hidden" name="repasId" value={repas.id} />
                  <input type="hidden" name="platId" value={plat.id} />
                  <button className={boutonTexte} type="submit">
                    Retirer
                  </button>
                </form>
              </div>
              <ul className="mt-4 space-y-4">
                {lignes.map((ingredient) => {
                  const quantite = quantiteTheorique(ingredient.grammageCle, service, compte, portions);
                  return (
                    <li key={ingredient.id} className="rounded-xl bg-paper px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{ingredient.nom}</p>
                        <form action={supprimerIngredient}>
                          <input type="hidden" name="slug" value={centre.slug} />
                          <input type="hidden" name="repasId" value={repas.id} />
                          <input type="hidden" name="ingredientId" value={ingredient.id} />
                          <button className={boutonTexte} type="submit">
                            Retirer
                          </button>
                        </form>
                      </div>
                      {quantite ? (
                        <DetailQuantite presents={compte} portions={quantite.portions} unite={quantite.unite} total={quantite.total} />
                      ) : (
                        <p className="text-sm text-danger">Famille de grammage inconnue.</p>
                      )}
                      <form action={changerFamille} className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="slug" value={centre.slug} />
                        <input type="hidden" name="repasId" value={repas.id} />
                        <input type="hidden" name="ingredientId" value={ingredient.id} />
                        <div className="min-w-0 flex-1">
                          <SelectFamille name="grammageCle" valeur={ingredient.grammageCle} />
                        </div>
                        <button className={boutonSecondaire} type="submit">
                          Changer la famille
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
              <form action={ajouterIngredient} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="slug" value={centre.slug} />
                <input type="hidden" name="repasId" value={repas.id} />
                <input type="hidden" name="platId" value={plat.id} />
                <input className={champ} name="nom" placeholder="Ingrédient" required />
                <SelectFamille name="grammageCle" />
                <button className={boutonSecondaire} type="submit">
                  Ajouter
                </button>
              </form>
            </article>
          );
        })}
      </div>

      <form action={ajouterPlat} className="grid gap-3 rounded-2xl border border-dashed border-line bg-card p-5 sm:grid-cols-[1fr_12rem_auto]">
        <input type="hidden" name="slug" value={centre.slug} />
        <input type="hidden" name="repasId" value={repas.id} />
        <input className={champ} name="nom" placeholder="Nouveau plat" required />
        <select className={champ} name="type" defaultValue="plat">
          {TYPES_PLAT.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <button className={bouton} type="submit">
          Ajouter le plat
        </button>
      </form>
    </div>
  );
}
