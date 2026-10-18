import Link from "next/link";
import { importerMenu } from "@/actions/menu";
import { enregistrerSejour } from "@/actions/sejour";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, champ } from "@/components/styles";
import { formaterJour, formaterJourCourt } from "@/lib/dates";
import {
  absencesDesRepas,
  comptesEffectifs,
  platsDesRepas,
  repasDuSejour,
  resoudreCentre,
  sejourDuCentre,
} from "@/lib/donnees";
import { presents } from "@/lib/effectifs";
import { lireAvis } from "@/lib/navigation";
import { SERVICES } from "@/lib/services";

export default async function PageMenus({
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
  const plats = await platsDesRepas(liste.map((item) => item.id));
  const inscrits = sejour ? await comptesEffectifs(sejour.id) : {};
  const absences = await absencesDesRepas(liste.map((item) => item.id));
  const jours = [...new Set(liste.map((item) => item.date))];

  return (
    <div className="space-y-6">
      <Bandeau erreur={avis.erreur} message={avis.message} />
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-serif text-2xl">Séjour</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/65">
          Les dates et les repas de début et de fin construisent la grille. La journée compte le petit-déjeuner, le déjeuner, le goûter et le dîner.
        </p>
        <form action={enregistrerSejour} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="slug" value={centre.slug} />
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Début</span>
            <input className={champ} type="date" name="dateDebut" required defaultValue={sejour?.dateDebut} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Fin</span>
            <input className={champ} type="date" name="dateFin" required defaultValue={sejour?.dateFin} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Repas de début</span>
            <select className={champ} name="repasDebut" defaultValue={sejour?.repasDebut ?? "petit_dejeuner"}>
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Repas de fin</span>
            <select className={champ} name="repasFin" defaultValue={sejour?.repasFin ?? "diner"}>
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button className={`${bouton} w-full`} type="submit">
              {sejour ? "Mettre à jour la grille" : "Créer la grille"}
            </button>
          </div>
        </form>
      </section>

      {sejour ? (
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-card p-5 lg:flex-row lg:items-end">
            <div>
              <h2 className="font-serif text-2xl">Grille</h2>
              <p className="mt-1 text-sm text-ink/65">
                Du {formaterJour(sejour.dateDebut)} au {formaterJour(sejour.dateFin)}. Cliquez un repas pour voir ses ingrédients.
              </p>
            </div>
            <form action={importerMenu} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input type="hidden" name="slug" value={centre.slug} />
              <input
                className="text-sm"
                type="file"
                name="fichier"
                accept="application/pdf,image/*"
                required
                aria-label="Menu en PDF ou en image"
              />
              <button className={boutonSecondaire} type="submit">
                Importer le menu
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="w-36 px-2 text-left text-xs font-semibold tracking-wide text-ink/50 uppercase">Jour</th>
                  {SERVICES.map((service) => (
                    <th key={service.id} className="px-2 text-left text-xs font-semibold tracking-wide text-ink/50 uppercase">
                      {service.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jours.map((jour) => (
                  <tr key={jour}>
                    <th className="px-2 align-top text-left text-sm font-semibold">{formaterJourCourt(jour)}</th>
                    {SERVICES.map((service) => {
                      const item = liste.find((repas) => repas.date === jour && repas.service === service.id);
                      if (!item) return <td key={service.id} />;
                      const noms = plats.filter((plat) => plat.repasId === item.id);
                      const compte = presents(inscrits, absences[item.id] ?? {});
                      return (
                        <td key={service.id} className="align-top">
                          <Link
                            href={`/centres/${centre.slug}/menus/${item.id}`}
                            className="block h-full rounded-xl border border-line bg-card p-3 transition hover:border-accent"
                          >
                            <span className="text-xs text-ink/50">{compte.total} présents</span>
                            {noms.length === 0 ? (
                              <span className="mt-1 block text-sm text-ink/45">À remplir</span>
                            ) : (
                              <ul className="mt-1 space-y-0.5 text-sm">
                                {noms.slice(0, 4).map((plat) => (
                                  <li key={plat.id}>{plat.nom}</li>
                                ))}
                                {noms.length > 4 ? <li className="text-ink/50">…</li> : null}
                              </ul>
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-sm text-ink/65">La grille apparaîtra dès que le séjour sera créé.</p>
      )}
    </div>
  );
}
