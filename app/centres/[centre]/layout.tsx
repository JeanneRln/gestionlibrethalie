import { Shell } from "@/components/Shell";
import { listerCentres, repasAConfirmer, resoudreCentre } from "@/lib/donnees";

export default async function LayoutCentre({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ centre: string }>;
}) {
  const centre = await resoudreCentre(params);
  const [centres, aConfirmer] = await Promise.all([listerCentres(), repasAConfirmer(centre.id)]);
  return (
    <Shell centre={centre} centres={centres} aConfirmer={aConfirmer}>
      {children}
    </Shell>
  );
}
