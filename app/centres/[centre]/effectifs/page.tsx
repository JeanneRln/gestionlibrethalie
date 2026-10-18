import { enregistrerAbsences } from "@/actions/effectifs";
import { Bandeau } from "@/components/Bandeau";
import { PyramideEffectifs } from "@/components/PyramideEffectifs";
import { boutonSecondaire, champ } from "@/components/styles";
import { formaterJour } from "@/lib/dates";
import { absencesDesRepas, comptesEffectifs, repasDuSejour, resoudreCentre, sejourDuCentre } from "@/lib/donnees";
import { AGES, presents, TRANCHE_ADULTE } from "@/lib/effectifs";
import { lireAvis } from "@/lib/navigation";
import { estService, libelleService } from "@/lib/services";

export default async function PageEffectifs({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const centre = await resoudreCentre(params);
  const avis = await lireAvis(searchParams);
  const sejour = await sejourDuCentre(centre.id);
  const liste = sejour ? await repasDuSejour(sejour.id) : [];
  const inscrits = sejour ? await comptesEffectifs(sejour.id) : {};
  const absences = await absencesDesRepas(liste.map((item) => item.id));
  const jours = [...new Set(liste.map((item) => item.date))];

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      {sejour ? (
        <PyramideEffectifs slug={centre.slug} valeurs={inscrits} />
      ) : (
        <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink/70">
          Créez le séjour dans l'onglet Menus pour saisir les effectifs.
        </p>
      )}
      {sejour ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Absents par repas</h2>
          <p className="text-sm text-ink/65">La pyramide reste la référence. Ici, vous notez seulement qui manque à un repas.</p>
          {jours.map((jour) => (
            <div key={jour} className="space-y-2">
              <h3 className="text-sm font-semibold text-ink/55">{formaterJour(jour)}</h3>
              {liste
                .filter((item) => item.date === jour)
                .map((item) => {
                  const service = estService(item.service) ? item.service : "dejeuner";
                  const absents = absences[item.id] ?? {};
                  const compte = presents(inscrits, absents);
                  const totalAbsents = AGES.reduce((somme, age) => somme + (absents[String(age)] ?? 0), 0) + (absents[TRANCHE_ADULTE] ?? 0);
                  return (
                    <details key={item.id} open={totalAbsents > 0} className="rounded-2xl border border-line bg-card px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {libelleService(service)} · {compte.total} présents
                        {totalAbsents > 0 ? ` · ${totalAbsents} absent${totalAbsents > 1 ? "s" : ""}` : ""}
                      </summary>
                      <form action={enregistrerAbsences} className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        <input type="hidden" name="slug" value={centre.slug} />
                        <input type="hidden" name="repasId" value={item.id} />
                        {AGES.map((age) => (
                          <label key={age} className="block text-sm">
                            <span className="mb-1 block text-ink/60">{age} ans</span>
                            <input
                              className={champ}
                              type="number"
                              min={0}
                              step={1}
                              name={`absent_${age}`}
                              defaultValue={absents[String(age)] ?? 0}
                            />
                          </label>
                        ))}
                        <label className="block text-sm">
                          <span className="mb-1 block text-ink/60">Adultes</span>
                          <input
                            className={champ}
                            type="number"
                            min={0}
                            step={1}
                            name={`absent_${TRANCHE_ADULTE}`}
                            defaultValue={absents[TRANCHE_ADULTE] ?? 0}
                          />
                        </label>
                        <div className="col-span-full">
                          <button className={boutonSecondaire} type="submit">
                            Enregistrer les absents
                          </button>
                        </div>
                      </form>
                    </details>
                  );
                })}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
