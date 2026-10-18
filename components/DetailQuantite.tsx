import { formaterPortion, formaterQuantite } from "@/lib/format";

export function DetailQuantite({
  presents,
  portions,
  unite,
  total,
}: {
  presents: { enfant: number; ado: number; adulte: number };
  portions: { enfant: number; ado: number; adulte: number };
  unite: string;
  total: number;
}) {
  return (
    <p className="text-sm text-ink/70">
      {presents.enfant} enfants × {formaterPortion(portions.enfant, unite)} + {presents.ado} ados ×{" "}
      {formaterPortion(portions.ado, unite)} + {presents.adulte} adultes × {formaterPortion(portions.adulte, unite)} ={" "}
      <strong className="text-ink">{formaterQuantite(total, unite === "piece" ? "piece" : unite)}</strong>
    </p>
  );
}
