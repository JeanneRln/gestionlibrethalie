export function Bandeau({ erreur, message }: { erreur?: string; message?: string }) {
  if (erreur) {
    return (
      <p className="rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
        {erreur}
      </p>
    );
  }
  if (message) {
    return (
      <p className="rounded-xl border border-pine/20 bg-foam px-4 py-3 text-sm text-pine" role="status">
        {message}
      </p>
    );
  }
  return null;
}
