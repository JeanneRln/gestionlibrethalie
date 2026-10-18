import "server-only";
import { creerConnexion, type Base } from "./connection";

export type { Base } from "./connection";
export { semerCentre } from "./seed";

const globalPourDb = globalThis as unknown as { gestionDb?: Base };

export async function getDb(): Promise<Base> {
  globalPourDb.gestionDb ??= creerConnexion().db;
  return globalPourDb.gestionDb;
}
