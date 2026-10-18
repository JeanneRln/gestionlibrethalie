import { redirect } from "next/navigation";

export function rediriger(chemin: string, type: "message" | "erreur", texte: string): never {
  const params = new URLSearchParams();
  params.set(type, texte.slice(0, 400));
  redirect(`${chemin}?${params.toString()}`);
}

export function cheminCentre(slug: string, section: string) {
  return `/centres/${slug}/${section}`;
}

export async function lireAvis(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const params = await searchParams;
  const lire = (cle: string) => {
    const valeur = params[cle];
    return typeof valeur === "string" ? valeur : undefined;
  };
  return { erreur: lire("erreur"), message: lire("message"), jour: lire("jour") };
}
