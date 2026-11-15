import { describe, expect, it } from 'vitest';
import { ageRelatif, grilleAnnee, niveauxPour } from './calendar.ts';

describe('niveauxPour', () => {
  it('met 0 sur les jours vides', () => {
    const map = niveauxPour([
      { date: '2026-01-01', count: 0 },
      { date: '2026-01-02', count: 10 },
    ]);
    expect(map.get('2026-01-01')).toBe(0);
    expect(map.get('2026-01-02')).toBeGreaterThan(0);
  });
});

describe('grilleAnnee', () => {
  it('ne place que des cellules de l’année demandée', () => {
    const { semaines } = grilleAnnee(2026, [
      { date: '2026-06-15', count: 3 },
    ]);
    const cellules = semaines.flat().filter(Boolean);
    expect(cellules.every(c => c!.date.startsWith('2026'))).toBe(true);
    expect(cellules.some(c => c!.date === '2026-06-15' && c!.count === 3)).toBe(
      true
    );
  });
});

describe('ageRelatif', () => {
  it('retourne null sans genere', () => {
    expect(ageRelatif(null)).toBeNull();
  });

  it('formule les minutes', () => {
    const maintenant = Date.parse('2026-11-15T12:00:00Z');
    expect(ageRelatif('2026-11-15T11:45:00Z', maintenant)).toBe('il y a 15 min');
  });
});
