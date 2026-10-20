import Link from "next/link";
import { importerMenu } from "@/actions/menu";
import { enregistrerSejour } from "@/actions/sejour";
import { Bandeau } from "@/components/Bandeau";
import { bouton, boutonSecondaire, champ } from "@/components/styles";
import { formaterJour } from "@/lib/dates";
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

function classeColonnes(nombre: number) {
  if (nombre >= 4) return "sm:grid-cols-2 xl:grid-cols-4";
  if (nombre === 3) return "sm:grid-cols-2 xl:grid-cols-3";
  if (nombre === 2) return "sm:grid-cols-2";
  return "sm:max-w-md";
}

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
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
            <div>
              <h2 className="font-serif text-2xl">Grille</h2>
              <p className="mt-1 text-sm text-ink/65">
                Du {formaterJour(sejour.dateDebut)} au {formaterJour(sejour.dateFin)}. Cliquez un repas pour voir ses ingrédients.
              </p>
            </div>
            <form action={importerMenu} className="flex flex-wrap items-center gap-2">
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
          <div className="space-y-4">
            {jours.map((jour) => {
              const repas = SERVICES.flatMap((service) => {
                const item = liste.find((repas) => repas.date === jour && repas.service === service.id);
                return item ? [{ service, item }] : [];
              });
              return (
              <section key={jour} className="rounded-2xl border border-line bg-card p-4">
                <h3 className="font-serif text-xl">{formaterJour(jour)}</h3>
                <div className={`mt-3 grid grid-cols-1 gap-3 ${classeColonnes(repas.length)}`}>
                  {repas.map(({ service, item }) => {
                    const noms = plats.filter((plat) => plat.repasId === item.id);
                    const compte = presents(inscrits, absences[item.id] ?? {});
                    return (
                      <Link
                        key={service.id}
                        href={`/centres/${centre.slug}/menus/${item.id}`}
                        className="block rounded-xl bg-paper p-3 transition hover:ring-2 hover:ring-accent"
                      >
                        <span className="text-xs font-semibold tracking-wide text-ink/45 uppercase">{service.label}</span>
                        <span className="mt-1 block text-xs text-ink/50">{compte.total} présents</span>
                        {noms.length === 0 ? (
                          <span className="mt-2 block text-sm text-ink/45">À remplir</span>
                        ) : (
                          <ul className="mt-2 space-y-1 text-sm leading-snug">
                            {noms.map((plat) => (
                              <li key={plat.id} className="break-words">{plat.nom}</li>
                            ))}
                          </ul>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
              );
            })}
          </div>
        </section>
      ) : (
        <p className="text-sm text-ink/65">La grille apparaîtra dès que le séjour sera créé.</p>
      )}
    </div>
  );
}
