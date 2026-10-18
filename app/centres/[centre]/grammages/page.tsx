import { enregistrerGrammages } from "@/actions/grammages";
import { Bandeau } from "@/components/Bandeau";
import { bouton, champ } from "@/components/styles";
import { grammagesDuCentre, resoudreCentre } from "@/lib/donnees";
import { formaterPortion } from "@/lib/format";
import { GROUPES_GRAMMAGE } from "@/lib/gemrcn/tables";
import { lireAvis } from "@/lib/navigation";

export default async function PageGrammages({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const centre = await resoudreCentre(params);
  const avis = await lireAvis(searchParams);
  const lignes = await grammagesDuCentre(centre.id);

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <div>
        <h2 className="font-serif text-3xl">Grammages GEMRCN</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink/70">
          Bases de l'annexe de juillet 2015, regroupées par famille. La portion retenue part de cette base et peut être augmentée, séparément pour les enfants de 7 à 10 ans, les ados de 11 à 17 ans et les adultes.
        </p>
      </div>
      <form action={enregistrerGrammages} className="space-y-8">
        <input type="hidden" name="slug" value={centre.slug} />
        {GROUPES_GRAMMAGE.map((groupe) => {
          const famille = lignes.filter((ligne) => ligne.serviceGroupe === groupe.id);
          return (
            <section key={groupe.id} className="space-y-3">
              <div>
                <h3 className="font-serif text-2xl">{groupe.titre}</h3>
                <p className="mt-1 max-w-3xl text-sm text-ink/65">{groupe.texte}</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-line bg-card">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="text-left text-xs tracking-wide text-ink/50 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Famille</th>
                      <th className="px-3 py-3 font-semibold">Base enfant</th>
                      <th className="px-3 py-3 font-semibold">Retenue enfant</th>
                      {groupe.id === "diner_enfant" ? null : (
                        <>
                          <th className="px-3 py-3 font-semibold">Base ado</th>
                          <th className="px-3 py-3 font-semibold">Retenue ado</th>
                          <th className="px-3 py-3 font-semibold">Base adulte</th>
                          <th className="px-3 py-3 font-semibold">Retenue adulte</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {famille.map((ligne) => (
                      <tr key={ligne.id} className="border-t border-line align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium">{ligne.libelle}</p>
                          <p className="mt-1 max-w-sm text-xs text-ink/55">{ligne.note}</p>
                        </td>
                        <CelluleBase valeur={ligne.baseEnfant} unite={ligne.unite} />
                        <CelluleSaisie id={ligne.id} colonne="enfant" valeur={ligne.retenuEnfant} minimum={ligne.baseEnfant} />
                        {groupe.id === "diner_enfant" ? null : (
                          <>
                            <CelluleBase valeur={ligne.baseAdo} unite={ligne.unite} />
                            <CelluleSaisie id={ligne.id} colonne="ado" valeur={ligne.retenuAdo} minimum={ligne.baseAdo} />
                            <CelluleBase valeur={ligne.baseAdulte} unite={ligne.unite} />
                            <CelluleSaisie id={ligne.id} colonne="adulte" valeur={ligne.retenuAdulte} minimum={ligne.baseAdulte} />
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        <button className={bouton} type="submit">
          Enregistrer les portions
        </button>
      </form>
    </div>
  );
}

function CelluleBase({ valeur, unite }: { valeur: number; unite: string }) {
  return <td className="px-3 py-3 text-ink/70">{formaterPortion(valeur, unite)}</td>;
}

function CelluleSaisie({
  id,
  colonne,
  valeur,
  minimum,
}: {
  id: string;
  colonne: "enfant" | "ado" | "adulte";
  valeur: number;
  minimum: number;
}) {
  return (
    <td className="px-3 py-3">
      <input className={`${champ} w-24`} type="number" name={`${id}_${colonne}`} min={minimum} step="0.1" defaultValue={valeur} />
    </td>
  );
}
