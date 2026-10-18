import { clesPourSelect } from "@/lib/gemrcn/tables";
import { champ } from "@/components/styles";

export function SelectFamille({ name, valeur, id }: { name: string; valeur?: string; id?: string }) {
  const cles = clesPourSelect();
  const groupes = [...new Set(cles.map((cle) => cle.groupe))];
  return (
    <select id={id} name={name} defaultValue={valeur ?? cles[0]?.cle} className={champ}>
      {groupes.map((groupe) => (
        <optgroup key={groupe} label={groupe}>
          {cles
            .filter((cle) => cle.groupe === groupe)
            .map((cle) => (
              <option key={cle.cle} value={cle.cle}>
                {cle.libelle}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
