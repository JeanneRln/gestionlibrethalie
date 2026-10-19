import Link from "next/link";
import { ajouterCentre } from "@/actions/centres";
import { Onglets } from "@/components/Onglets";
import { formaterJourCourt } from "@/lib/dates";
import { libelleService, type ServiceId } from "@/lib/services";
import { bouton, champ } from "@/components/styles";

export function Shell({
  centre,
  centres,
  aConfirmer,
  children,
}: {
  centre: { slug: string; nom: string };
  centres: { slug: string; nom: string }[];
  aConfirmer: { id: string; date: string; service: string }[];
  children: React.ReactNode;
}) {
  const premier = aConfirmer[0];
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-white lg:sticky lg:top-0 lg:h-screen lg:w-60">
        <div className="px-5 py-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">Gestion libre</p>
          <p className="mt-1 font-serif text-2xl">Centres en cours</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3" aria-label="Centres">
          {centres.map((item) => {
            const actif = item.slug === centre.slug;
            return (
              <Link
                key={item.slug}
                href={`/centres/${item.slug}/menus`}
                aria-current={actif ? "page" : undefined}
                className={`block rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  actif ? "bg-white/15 text-white ring-1 ring-white/20" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.nom}
              </Link>
            );
          })}
        </nav>
        <form action={ajouterCentre} className="mt-auto space-y-2 border-t border-white/10 p-4">
          <label className="block text-xs text-white/60" htmlFor="nouveau-centre">
            Nouveau centre
          </label>
          <input id="nouveau-centre" name="nom" placeholder="Nom du centre" className={`${champ} bg-white/95`} />
          <button className={`${bouton} w-full`} type="submit">
            Ajouter
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 px-5 pt-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-ink/45 uppercase">Centre</p>
            <h1 className="font-serif text-4xl text-ink">{centre.nom}</h1>
          </div>
          <Onglets slug={centre.slug} />
        </header>
        {aConfirmer.length > 0 ? (
          <div className="px-5 pt-4 sm:px-8">
            <Link
              href={`/centres/${centre.slug}/stock/point`}
              className="block rounded-xl bg-warnbg px-4 py-3 text-sm font-medium text-warn"
            >
              {aConfirmer.length === 1 && premier
                ? `Le ${libelleService(premier.service as ServiceId).toLowerCase()} du ${formaterJourCourt(premier.date)} est passé. Régulariser les quantités.`
                : `${aConfirmer.length} repas sont passés. Régulariser les quantités.`}
            </Link>
          </div>
        ) : null}
        <main className="px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
