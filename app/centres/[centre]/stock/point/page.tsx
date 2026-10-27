import { redirect } from "next/navigation";

export default async function PagePointStock({
  params,
  searchParams,
}: {
  params: Promise<{ centre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { centre } = await params;
  const query = await searchParams;
  const paramsUrl = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(query)) {
    if (typeof valeur === "string") paramsUrl.set(cle, valeur);
  }
  const suite = paramsUrl.size > 0 ? `?${paramsUrl.toString()}` : "";
  redirect(`/centres/${centre}/stock${suite}`);
}
