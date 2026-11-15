import { z } from 'zod';

export const JourSchema = z.object({
  date: z.string(),
  count: z.number().nonnegative(),
});

export const DonneesSchema = z.object({
  genere: z.string().nullable(),
  annee: z.number().int(),
  contributions: z.number().nonnegative(),
  depots: z.number().nonnegative(),
  jours: z.array(JourSchema),
  partiel: z.boolean().optional(),
});

export type Donnees = z.infer<typeof DonneesSchema>;
export type Jour = z.infer<typeof JourSchema>;
