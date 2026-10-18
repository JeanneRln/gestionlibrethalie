"use client";

export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <h1 className="font-serif text-4xl">La page n'a pas pu s'afficher.</h1>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
      >
        Réessayer
      </button>
    </main>
  );
}
