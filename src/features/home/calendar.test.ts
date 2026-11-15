import { describe, expect, it } from 'vitest';
import {
  ageRelatif,
  dernierJourActif,
  grilleAnnee,
  grilleRecente,
  niveauxPour,
  picsActivite,
  rythmeSemaine,
} from './calendar.ts';

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
    const { semaines } = grilleAnnee(2026, [{ date: '2026-06-15', count: 3 }]);
    const cellules = semaines.flat().filter(Boolean);
    expect(cellules.every(c => c!.date.startsWith('2026'))).toBe(true);
    expect(cellules.some(c => c!.date === '2026-06-15' && c!.count === 3)).toBe(
      true
    );
  });
});

describe('grilleRecente', () => {
  it('ne garde que les dernières semaines', () => {
    const pleine = grilleAnnee(2026, [{ date: '2026-11-01', count: 2 }]);
    const { semaines } = grilleRecente(
      2026,
      [{ date: '2026-11-01', count: 2 }],
      13
    );
    expect(semaines.length).toBe(Math.min(13, pleine.semaines.length));
  });
});

describe('dernierJourActif / pics / rythme', () => {
  const jours = [
    { date: '2026-01-05', count: 10 }, // lundi
    { date: '2026-01-06', count: 20 }, // mardi
    { date: '2026-01-11', count: 5 }, // dimanche
    { date: '2026-10-26', count: 100 },
  ];

  it('retrouve le dernier jour actif', () => {
    expect(dernierJourActif(jours)).toBe('2026-10-26');
  });

  it('classe les pics', () => {
    expect(picsActivite(jours, 2).map(j => j.count)).toEqual([100, 20]);
  });

  it('moyenne par jour de semaine', () => {
    const r = rythmeSemaine(jours);
    expect(r).toHaveLength(7);
    // 2026-01-05 et 2026-10-26 sont tous deux des lundis
    expect(r[1]!.moyenne).toBe(55);
  });
});

describe('ageRelatif', () => {
  it('retourne null sans genere', () => {
    expect(ageRelatif(null)).toBeNull();
  });

  it('formule les minutes', () => {
    const maintenant = Date.parse('2026-11-15T12:00:00Z');
    expect(ageRelatif('2026-11-15T11:45:00Z', maintenant)).toBe(
      'il y a 15 min'
    );
  });
});
