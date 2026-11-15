import { DonneesSchema, type Donnees } from './types.ts';

/** Charge l'instantané public. Relatif à la base Vite (Pages sous /mister-contrib/). */
export async function loadDonnees(signal?: AbortSignal): Promise<Donnees> {
  const res = await fetch(`${import.meta.env.BASE_URL}donnees.json`, {
    signal,
    cache: 'no-cache',
  });
  if (!res.ok) {
    throw new Error(`donnees.json HTTP ${res.status}`);
  }
  return DonneesSchema.parse(await res.json());
}
