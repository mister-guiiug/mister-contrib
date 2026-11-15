import type { Jour } from './types.ts';

export type Cellule = {
  date: string;
  count: number;
  /** 0 = vide, 1–4 = intensité */
  niveau: number;
};

/** Seuils type contribution graph : quartiles sur les jours actifs. */
export function niveauxPour(jours: Jour[]): Map<string, number> {
  const actifs = jours.map(j => j.count).filter(c => c > 0).sort((a, b) => a - b);
  const map = new Map<string, number>();
  if (actifs.length === 0) {
    for (const j of jours) map.set(j.date, 0);
    return map;
  }
  const q = (p: number) => actifs[Math.min(actifs.length - 1, Math.floor(actifs.length * p))]!;
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  for (const j of jours) {
    let niveau = 0;
    if (j.count > 0) {
      if (j.count <= t1) niveau = 1;
      else if (j.count <= t2) niveau = 2;
      else if (j.count <= t3) niveau = 3;
      else niveau = 4;
    }
    map.set(j.date, niveau);
  }
  return map;
}

/**
 * Grille année civile : colonnes = semaines (dimanche en tête, comme GitHub),
 * lignes = jours. Les trous hors année sont null.
 */
export function grilleAnnee(
  annee: number,
  jours: Jour[]
): { semaines: (Cellule | null)[][]; mois: { label: string; col: number }[] } {
  const counts = new Map(jours.map(j => [j.date, j.count]));
  const niveaux = niveauxPour(
    [...counts.entries()].map(([date, count]) => ({ date, count }))
  );

  const debut = new Date(Date.UTC(annee, 0, 1));
  const fin = new Date(Date.UTC(annee, 11, 31));
  // Décaler au dimanche précédent (ou le jour même s'il est dimanche).
  const curseur = new Date(debut);
  curseur.setUTCDate(curseur.getUTCDate() - curseur.getUTCDay());

  const semaines: (Cellule | null)[][] = [];
  do {
    const semaine: (Cellule | null)[] = [];
    for (let d = 0; d < 7; d += 1) {
      const y = curseur.getUTCFullYear();
      const m = String(curseur.getUTCMonth() + 1).padStart(2, '0');
      const day = String(curseur.getUTCDate()).padStart(2, '0');
      const date = `${y}-${m}-${day}`;
      if (y === annee) {
        const count = counts.get(date) ?? 0;
        semaine.push({
          date,
          count,
          niveau: niveaux.get(date) ?? (count > 0 ? 1 : 0),
        });
      } else {
        semaine.push(null);
      }
      curseur.setUTCDate(curseur.getUTCDate() + 1);
    }
    semaines.push(semaine);
  } while (curseur <= fin && semaines.length < 60);

  const moisLabels = [
    'Jan',
    'Fév',
    'Mar',
    'Avr',
    'Mai',
    'Juin',
    'Juil',
    'Aoû',
    'Sep',
    'Oct',
    'Nov',
    'Déc',
  ];
  const mois: { label: string; col: number }[] = [];
  let dernierMois = -1;
  semaines.forEach((semaine, col) => {
    const cellule = semaine.find(c => c !== null);
    if (!cellule) return;
    const m = Number(cellule.date.slice(5, 7)) - 1;
    if (m !== dernierMois) {
      mois.push({ label: moisLabels[m]!, col });
      dernierMois = m;
    }
  });

  return { semaines, mois };
}

/** Relatif « Vérifié il y a … » à partir d'un ISO. */
export function ageRelatif(genere: string | null, maintenant = Date.now()): string | null {
  if (!genere) return null;
  const t = Date.parse(genere);
  if (Number.isNaN(t)) return null;
  const sec = Math.max(0, Math.floor((maintenant - t) / 1000));
  if (sec < 60) return 'à l’instant';
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}
