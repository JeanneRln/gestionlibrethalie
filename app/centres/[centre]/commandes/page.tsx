import { ignorerLigne, importerCommande, validerLignes } from "@/actions/commandes";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, boutonTexte, champ } from "@/components/styles";
import { formaterJour } from "@/lib/dates";
import { commandesDuCentre, resoudreCentre } from "@/lib/donnees";
import { formaterNombre } from "@/lib/format";
import { lireAvis } from "@/lib/navigation";
import { FOURNISSEURS } from "@/lib/services";
import { UNITES_COMMANDE } from "@/lib/unites";

const SEUIL = 0.75;

export default async function PageCommandes({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const centre = await resoudreCentre(params);
  const avis = await lireAvis(searchParams);
  const liste = await commandesDuCentre(centre.id);

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-serif text-3xl">Commandes</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/70">
          Importez le PDF Transgourmet ou Sysco. Les quantités incertaines restent à valider avant d'entrer en stock.
        </p>
        <form action={importerCommande} className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <input type="hidden" name="slug" value={centre.slug} />
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Fournisseur</span>
            <select className={champ} name="fournisseur" defaultValue="transgourmet">
              {FOURNISSEURS.map((fournisseur) => (
                <option key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">PDF ou image</span>
            <input className="text-sm" type="file" name="fichier" accept="application/pdf,image/*" required />
          </label>
          <button className={bouton} type="submit">
            Lire la commande
          </button>
        </form>
      </section>

      {liste.length === 0 ? <p className="text-sm text-ink/65">Aucune commande importée.</p> : null}

      {liste.map((commande) => {
        const enAttente = commande.lignes.filter((ligne) => ligne.statut === "a_valider");
        const traitees = commande.lignes.filter((ligne) => ligne.statut !== "a_valider");
        const fournisseur = FOURNISSEURS.find((item) => item.id === commande.fournisseur)?.label ?? commande.fournisseur;
        return (
          <section key={commande.id} className="rounded-2xl border border-line bg-card p-5">
            <h3 className="font-serif text-2xl">{fournisseur}</h3>
            <p className="text-sm text-ink/55">
              {commande.fichierNom}
              {commande.dateCommande ? ` · ${formaterJour(commande.dateCommande)}` : ""}
            </p>
            {enAttente.length > 0 ? (
              <form action={validerLignes} className="mt-4 space-y-3">
                <input type="hidden" name="slug" value={centre.slug} />
                <input type="hidden" name="commandeId" value={commande.id} />
                {enAttente.map((ligne) => {
                  const doute = ligne.quantite === null || ligne.confiance < SEUIL || ligne.unite === "colis";
                  return (
                    <div
                      key={ligne.id}
                      className={`grid items-end gap-3 rounded-xl p-3 lg:grid-cols-[auto_1fr_8rem_8rem_auto] ${doute ? "bg-warnbg" : "bg-paper"}`}
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={`ok_${ligne.id}`} defaultChecked={!doute} />
                        Valider
                      </label>
                      <div>
                        <p className="font-medium">{ligne.nomProduit}</p>
                        <p className="text-xs text-ink/55">Confiance {formaterNombre(ligne.confiance * 100)} %{doute ? " · à vérifier" : ""}</p>
                      </div>
                      <input
                        className={champ}
                        type="number"
                        min={0}
                        step="0.01"
                        name={`q_${ligne.id}`}
                        defaultValue={ligne.quantite ?? ""}
                        aria-label={`Quantité de ${ligne.nomProduit}`}
                      />
                      <select className={champ} name={`u_${ligne.id}`} defaultValue={ligne.unite} aria-label={`Unité de ${ligne.nomProduit}`}>
                        {UNITES_COMMANDE.map((unite) => (
                          <option key={unite.id} value={unite.id}>
                            {unite.label}
                          </option>
                        ))}
                      </select>
                      <button className={boutonTexte} type="submit" formAction={ignorerLigne} name="ligneId" value={ligne.id}>
                        Ignorer
                      </button>
                    </div>
                  );
                })}
                <button className={bouton} type="submit">
                  Entrer la sélection en stock
                </button>
              </form>
            ) : null}
            {traitees.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm text-ink/70">
                {traitees.map((ligne) => (
                  <li key={ligne.id}>
                    {ligne.nomProduit} · {ligne.statut === "validee" ? `${ligne.quantite ?? ""} ${ligne.unite} en stock` : "ignoré"}
                  </li>
                ))}
              </ul>
            ) : null}
            {enAttente.length === 0 ? null : (
              <p className="mt-3 text-xs text-ink/50">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-warnbg ring-1 ring-warn" />
                Les lignes sur fond sable sont celles dont l'IA est peu sûre.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
