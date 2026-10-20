import Link from "next/link";
import type { ReactNode } from "react";
import { ajouterProduit, ajusterStock } from "@/actions/stock";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, champ } from "@/components/styles";
import { bilanSemaine, classerBilan, proposableAuMenu, type LigneBilan } from "@/lib/bilan";
import { chaqueJour, formaterJour, formaterJourCourt } from "@/lib/dates";
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
import { formaterPortion, formaterQuantite } from "@/lib/format";
import { lireAvis } from "@/lib/navigation";
import { stockReel } from "@/lib/projection";
import { estService } from "@/lib/services";
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

  const liste = sejour ? await repasDuSejour(sejour.id) : [];
  const plats = liste.length > 0 ? await platsDesRepas(liste.map((item) => item.id)) : [];
  const ingredients = plats.length > 0 ? await ingredientsDesPlats(plats.map((plat) => plat.id)) : [];
  const grammages = sejour ? await grammagesDuCentre(centre.id) : [];
  const jours = sejour ? chaqueJour(sejour.dateDebut, sejour.dateFin) : [];
  const bilan = sejour
    ? bilanSemaine({
        produits,
        mouvements,
        repas: liste.flatMap((item) =>
          estService(item.service) ? [{ id: item.id, date: item.date, service: item.service, confirmeLe: item.confirmeLe }] : [],
        ),
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
        absences: await absencesDesRepas(liste.map((item) => item.id)),
      })
    : { lignes: [], nonComptes: [] };

  const manque = bilan.lignes.filter((ligne) => classerBilan(ligne) === "manque");
  const inutilise = bilan.lignes.filter((ligne) => classerBilan(ligne) === "inutilise" && proposableAuMenu(ligne.nom));
  const horsMenu = bilan.lignes.filter((ligne) => classerBilan(ligne) === "inutilise" && !proposableAuMenu(ligne.nom));
  const reste = bilan.lignes.filter((ligne) => classerBilan(ligne) === "reste");
  const pieces = bilan.lignes.filter((ligne) => classerBilan(ligne) === "pieces");
  const tableau = bilan.lignes.filter((ligne) => classerBilan(ligne) !== "ignore");
  const enStock = produits.flatMap((produit) => {
    const quantite = stockReel(mouvements, produit.id);
    return quantite > 0 ? [{ produit, quantite }] : [];
  });
  const aZero = produits.filter((produit) => stockReel(mouvements, produit.id) <= 0);

  return (
    <div className="space-y-8">
      <Bandeau erreur={avis.erreur} message={avis.message} />

      {aConfirmer.length > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warnbg p-5">
          <div>
            <h2 className="font-serif text-2xl text-warn">Repas déjà passés</h2>
            <p className="mt-1 text-sm text-ink/70">Indiquez ce qui est vraiment sorti. Le stock et la semaine se mettent à jour ensuite.</p>
          </div>
          <Link href={`/centres/${centre.slug}/stock/point`} className={bouton}>
            Régulariser
          </Link>
        </section>
      ) : null}

      {!sejour ? (
        <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink/70">Créez d'abord le séjour pour voir la semaine.</p>
      ) : (
        <section className="space-y-5">
          <div>
            <h2 className="font-serif text-3xl">La semaine</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink/70">
              Du {formaterJour(jours[0] ?? sejour.dateDebut).toLowerCase()} au {formaterJour(jours.at(-1) ?? sejour.dateFin).toLowerCase()}.
              Ce que les menus vont prendre, comparé à ce qui est en stock.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Bloc
              titre="À prévoir en plus"
              texte="Les menus en demandent plus que le stock."
              vide="Rien à prévoir : le stock couvre les menus."
              ton="danger"
              lien={{ href: `/centres/${centre.slug}/commandes`, label: "Voir les commandes" }}
            >
              {manque.map((ligne) => (
                <li key={ligne.produitId} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-medium">{ligne.nom}</span>
                    <span className="mt-0.5 block text-xs text-ink/55">
                      En stock {formaterQuantite(ligne.stock, ligne.uniteBase)} · menus {formaterQuantite(ligne.aSortir, ligne.uniteBase)}
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-xl text-danger">+ {formaterQuantite(-ligne.reste, ligne.uniteBase)}</span>
                </li>
              ))}
            </Bloc>

            <Bloc
              titre="À ajouter aux menus"
              texte="En stock, et aucun repas ne les utilise."
              vide="Tout le stock est déjà dans un menu."
              ton="warn"
              lien={{ href: `/centres/${centre.slug}/menus`, label: "Voir les menus" }}
            >
              {inutilise.map((ligne) => (
                <li key={ligne.produitId} className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{ligne.nom}</span>
                  <span className="shrink-0 font-serif text-xl">{formaterQuantite(ligne.stock, ligne.uniteBase)}</span>
                </li>
              ))}
            </Bloc>

            <Bloc
              titre="Il en restera"
              texte="Les menus n'utilisent pas tout. On peut en remettre."
              vide="Les menus utilisent à peu près tout ce qu'ils prévoient."
              ton="pine"
              lien={{ href: `/centres/${centre.slug}/menus`, label: "Voir les menus" }}
            >
              {reste.map((ligne) => (
                <li key={ligne.produitId} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-medium">{ligne.nom}</span>
                    <span className="mt-0.5 block text-xs text-ink/55">
                      En stock {formaterQuantite(ligne.stock, ligne.uniteBase)} · menus {formaterQuantite(ligne.aSortir, ligne.uniteBase)}
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-xl text-pine">{formaterQuantite(ligne.reste, ligne.uniteBase)}</span>
                </li>
              ))}
            </Bloc>
          </div>

          {horsMenu.length > 0 ? (
            <details className="rounded-2xl border border-line bg-card p-5 text-sm">
              <summary className="cursor-pointer font-medium">Condiments et fournitures non utilisés ({horsMenu.length})</summary>
              <p className="mt-2 text-ink/60">Ils ne sont dans aucun menu. Ce ne sont pas des plats à ajouter.</p>
              <ul className="mt-3 space-y-1">
                {horsMenu.map((ligne) => (
                  <li key={ligne.produitId} className="flex justify-between gap-3">
                    <span>{ligne.nom}</span>
                    <span className="text-ink/60">{formaterQuantite(ligne.stock, ligne.uniteBase)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {pieces.length > 0 ? (
            <div className="rounded-2xl border border-line bg-card p-5">
              <h3 className="font-serif text-xl">Au menu, à compter en pièces</h3>
              <p className="mt-1 text-sm text-ink/60">Le stock est en pièces et la portion en poids. Le chiffre des menus est le poids prévu, pas un nombre de pièces.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {pieces.map((ligne) => (
                  <li key={ligne.produitId} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{ligne.nom}</span>
                    <span className="text-ink/65">
                      {formaterQuantite(ligne.stock, ligne.uniteBase)} en stock
                      {ligne.portion > 0 ? ` · portion prévue ${formaterPortion(ligne.portion, ligne.portionUnite)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="px-5 pt-5">
              <h3 className="font-serif text-2xl">Quantités jour par jour</h3>
              <p className="mt-1 text-sm text-ink/60">Chaque case est ce que les menus prennent ce jour-là. La dernière colonne est ce qu'il reste une fois toute la semaine servie.</p>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="text-xs text-ink/50">
                  <tr>
                    <th className="sticky left-0 bg-card px-5 py-2 font-medium">Produit</th>
                    <th className="px-3 py-2 font-medium">En stock</th>
                    {jours.map((jour) => (
                      <th key={jour} className="px-3 py-2 font-medium whitespace-nowrap">
                        {formaterJourCourt(jour).replace(".", "")}
                      </th>
                    ))}
                    <th className="px-5 py-2 font-medium">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {tableau.map((ligne) => {
                    const classe = classerBilan(ligne);
                    return (
                      <tr key={ligne.produitId} className="border-t border-line">
                        <th className="sticky left-0 bg-card px-5 py-2 text-left font-medium">{ligne.nom}</th>
                        <td className="px-3 py-2 whitespace-nowrap text-ink/70">{formaterQuantite(ligne.stock, ligne.uniteBase)}</td>
                        {jours.map((jour) => {
                          const quantite = ligne.parJour[jour] ?? 0;
                          return (
                            <td key={jour} className="px-3 py-2 whitespace-nowrap">
                              {quantite > 0 ? formaterQuantite(quantite, ligne.uniteBase) : <span className="text-ink/25">·</span>}
                            </td>
                          );
                        })}
                        <td className={`px-5 py-2 whitespace-nowrap ${classe === "manque" ? "font-semibold text-danger" : classe === "inutilise" ? "text-warn" : ""}`}>
                          {texteReste(ligne, classe)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {bilan.nonComptes.length > 0 ? (
              <p className="px-5 py-4 text-sm text-ink/55">
                Pas comptés dans la semaine, le plat ne désigne pas un produit précis : {bilan.nonComptes.join(", ")}.
              </p>
            ) : null}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-3xl">Ce qui est en stock</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink/70">Les livraisons déjà rentrées. Pour un repas passé, passez par Régulariser plutôt que de corriger chaque produit.</p>
        </div>
        <form action={ajouterProduit} className="grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
          <input type="hidden" name="slug" value={centre.slug} />
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Produit déjà là, pas encore saisi</span>
            <input className={champ} name="nom" placeholder="Banane, menthe…" required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Quantité</span>
            <input className={champ} type="number" min={0} step="0.01" name="quantite" required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink/60">Unité</span>
            <select className={champ} name="unite" defaultValue="kg">
              {UNITES_COMMANDE.filter((unite) => unite.id !== "colis").map((unite) => (
                <option key={unite.id} value={unite.id}>
                  {unite.label}
                </option>
              ))}
            </select>
          </label>
          <button className={bouton} type="submit">
            Ajouter
          </button>
        </form>

        {enStock.length === 0 ? <p className="text-sm text-ink/65">Aucune quantité en stock pour l'instant.</p> : null}
        <ul className="space-y-2">
          {enStock.map(({ produit, quantite }) => (
            <LigneInventaire key={produit.id} slug={centre.slug} nom={produit.nom} produitId={produit.id} quantite={quantite} uniteBase={produit.uniteBase} />
          ))}
        </ul>
        {aZero.length > 0 ? (
          <details className="rounded-2xl border border-line bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Produits à zéro ({aZero.length})</summary>
            <ul className="mt-3 space-y-2">
              {aZero.map((produit) => (
                <LigneInventaire key={produit.id} slug={centre.slug} nom={produit.nom} produitId={produit.id} quantite={0} uniteBase={produit.uniteBase} />
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </div>
  );
}

function Bloc({
  titre,
  texte,
  vide,
  ton,
  lien,
  children,
}: {
  titre: string;
  texte: string;
  vide: string;
  ton: "danger" | "warn" | "pine";
  lien?: { href: string; label: string };
  children: ReactNode[];
}) {
  const bord = ton === "danger" ? "border-danger/30" : ton === "warn" ? "border-warn/30" : "border-pine/30";
  return (
    <section className={`rounded-2xl border bg-card p-5 ${bord}`}>
      <h3 className="font-serif text-2xl">{titre}</h3>
      <p className="mt-1 text-sm text-ink/65">{texte}</p>
      {children.length === 0 ? (
        <p className="mt-4 text-sm text-ink/70">{vide}</p>
      ) : (
        <ul className="mt-4 space-y-3">{children}</ul>
      )}
      {lien && children.length > 0 ? (
        <Link href={lien.href} className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
          {lien.label}
        </Link>
      ) : null}
    </section>
  );
}

function texteReste(ligne: LigneBilan, classe: ReturnType<typeof classerBilan>) {
  if (classe === "pieces") return "en pièces";
  if (classe === "manque") return `manque ${formaterQuantite(-ligne.reste, ligne.uniteBase)}`;
  if (classe === "inutilise") return "pas au menu";
  if (classe === "equilibre") return "ça passe";
  return formaterQuantite(ligne.reste, ligne.uniteBase);
}

function LigneInventaire({
  slug,
  nom,
  produitId,
  quantite,
  uniteBase,
}: {
  slug: string;
  nom: string;
  produitId: string;
  quantite: number;
  uniteBase: string;
}) {
  const saisie = uniteBase === "ml" ? { label: "L", facteur: 1000 } : uniteBase === "piece" ? { label: "pièces", facteur: 1 } : { label: "kg", facteur: 1000 };
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <div>
        <p className="font-medium">{nom}</p>
        <p className="text-sm text-ink/55">{formaterQuantite(quantite, uniteBase)}</p>
      </div>
      <form action={ajusterStock} className="flex items-end gap-2">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="produitId" value={produitId} />
        <label className="text-xs text-ink/55">
          Quantité réelle ({saisie.label})
          <input
            className={`${champ} mt-1 w-28`}
            type="number"
            min={0}
            step="0.01"
            name="quantite"
            defaultValue={Math.round((quantite / saisie.facteur) * 1000) / 1000}
            aria-label={`Quantité réelle de ${nom}`}
          />
        </label>
        <button className={boutonSecondaire} type="submit">
          Corriger
        </button>
      </form>
    </li>
  );
}
