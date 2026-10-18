"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "menus", label: "Menus" },
  { href: "effectifs", label: "Effectifs" },
  { href: "commandes", label: "Commandes" },
  { href: "grammages", label: "Grammages" },
  { href: "stock", label: "Stock" },
];

export function Onglets({ slug }: { slug: string }) {
  const chemin = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Sections du centre">
      {ONGLETS.map((onglet) => {
        const href = `/centres/${slug}/${onglet.href}`;
        const actif = chemin === href || chemin.startsWith(`${href}/`);
        return (
          <Link
            key={onglet.href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`rounded-t-xl px-4 py-2 text-sm font-semibold ${
              actif ? "bg-card text-ink shadow-[inset_0_-2px_0_0_var(--color-accent)]" : "text-ink/55 hover:text-ink"
            }`}
          >
            {onglet.label}
          </Link>
        );
      })}
    </nav>
  );
}
