import { describe, expect, it } from 'vitest';
import { assertAnonyme, fusionner } from './fusion.mjs';

describe('fusionner', () => {
  it('somme les jours et les dépôts sans exposer les sources', () => {
    const out = fusionner(
      [
        {
          depots: 10,
          jours: [
            { date: '2026-01-01', count: 2 },
            { date: '2026-01-02', count: 1 },
          ],
        },
        {
          depots: 5,
          jours: [{ date: '2026-01-01', count: 3 }],
        },
      ],
      { annee: 2026, genere: '2026-11-15T00:00:00.000Z' }
    );

    expect(out).toEqual({
      genere: '2026-11-15T00:00:00.000Z',
      annee: 2026,
      contributions: 6,
      depots: 15,
      jours: [
        { date: '2026-01-01', count: 5 },
        { date: '2026-01-02', count: 1 },
      ],
    });
    expect(JSON.stringify(out)).not.toMatch(/github|gitlab|kind|sources/i);
  });

  it('marque partiel sans nommer la forge en échec', () => {
    const out = fusionner(
      [
        { depots: 1, jours: [{ date: '2026-06-01', count: 4 }] },
        { depots: 0, jours: [], erreur: 'gitlab HTTP 401' },
      ],
      { annee: 2026, genere: 't' }
    );
    expect(out.partiel).toBe(true);
    expect(out.contributions).toBe(4);
    expect(out.depots).toBe(1);
    expect(JSON.stringify(out)).not.toMatch(/gitlab|erreur|401/i);
  });

  it('ignore les jours hors année civile', () => {
    const out = fusionner(
      [
        {
          depots: 0,
          jours: [
            { date: '2025-12-31', count: 9 },
            { date: '2026-01-01', count: 1 },
          ],
        },
      ],
      { annee: 2026, genere: 't' }
    );
    expect(out.jours).toEqual([{ date: '2026-01-01', count: 1 }]);
    expect(out.contributions).toBe(1);
  });
});

describe('assertAnonyme', () => {
  it('refuse une clé kind', () => {
    expect(() => assertAnonyme({ kind: 'github', jours: [] })).toThrow(/kind/);
  });

  it('accepte un instantané propre', () => {
    expect(
      assertAnonyme({
        genere: 't',
        annee: 2026,
        contributions: 0,
        depots: 0,
        jours: [],
      })
    ).toMatchObject({ annee: 2026 });
  });
});
