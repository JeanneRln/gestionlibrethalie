"use client";

import { useState } from "react";
import { enregistrerPyramide } from "@/actions/effectifs";
import { bouton, champ } from "@/components/styles";
import { parserCollage } from "@/lib/collage";
import { AGES, inscritsParTranche, TRANCHE_ADULTE } from "@/lib/effectifs";

export function PyramideEffectifs({
  slug,
  valeurs,
}: {
  slug: string;
  valeurs: Record<string, number>;
}) {
  const [nombres, setNombres] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const age of AGES) initial[String(age)] = String(valeurs[String(age)] ?? 0);
    initial[TRANCHE_ADULTE] = String(valeurs[TRANCHE_ADULTE] ?? 0);
    return initial;
  });

  function coller(evenement: React.ClipboardEvent<HTMLFormElement>) {
    const texte = evenement.clipboardData.getData("text");
    const lu = parserCollage(texte);
    if (!lu) return;
    evenement.preventDefault();
    setNombres((actuel) => ({ ...actuel, ...lu }));
  }

  const comptes: Record<string, number> = {};
  for (const [cle, valeur] of Object.entries(nombres)) comptes[cle] = Number(valeur) || 0;
  const bilan = inscritsParTranche(comptes);

  return (
    <form action={enregistrerPyramide} onPaste={coller} className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <h2 className="font-serif text-2xl">Pyramide du séjour</h2>
        <p className="mt-1 text-sm text-ink/65">
          Une fois pour tout le séjour. Vous pouvez coller une ligne de tableur : les âges de 7 à 17 ans, puis les adultes.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {AGES.map((age) => (
          <label key={age} className="block text-sm">
            <span className="mb-1 block text-ink/70">{age} ans</span>
            <input
              className={champ}
              type="number"
              min={0}
              step={1}
              name={`tranche_${age}`}
              value={nombres[String(age)] ?? "0"}
              onChange={(evenement) => setNombres((actuel) => ({ ...actuel, [String(age)]: evenement.target.value }))}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block text-ink/70">Adultes</span>
          <input
            className={champ}
            type="number"
            min={0}
            step={1}
            name={`tranche_${TRANCHE_ADULTE}`}
            value={nombres[TRANCHE_ADULTE] ?? "0"}
            onChange={(evenement) => setNombres((actuel) => ({ ...actuel, [TRANCHE_ADULTE]: evenement.target.value }))}
          />
        </label>
      </div>
      <p className="text-sm text-ink/75">
        {bilan.enfant} enfants (7-10 ans) · {bilan.ado} ados (11-17 ans) · {bilan.adulte} adultes
      </p>
      <button className={bouton} type="submit">
        Enregistrer la pyramide
      </button>
    </form>
  );
}
