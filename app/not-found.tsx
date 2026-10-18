import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink/45 uppercase">Introuvable</p>
      <h1 className="mt-2 font-serif text-4xl">Cette page n'existe pas.</h1>
      <Link href="/centres/menton/menus" className="mt-6 inline-block text-sm font-semibold text-accent">
        Retour à Menton
      </Link>
    </main>
  );
}
