import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { grilleAnnee } from './calendar.ts';
import type { Jour } from './types.ts';

type Props = {
  annee: number;
  jours: Jour[];
};

const JOURS_LIBELLES = ['', 'Lun', '', 'Mer', '', 'Ven', ''] as const;

/**
 * Calendrier type contribution graph.
 * Mobile : scroll horizontal, cellules lisibles, ancré sur la fin d’année.
 * Desktop : grille qui remplit la largeur du contenu.
 */
export function ContributionCalendar({ annee, jours }: Props) {
  const { t } = useI18n();
  const { semaines, mois } = useMemo(
    () => grilleAnnee(annee, jours),
    [annee, jours]
  );
  const [survol, setSurvol] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Sur mobile le début d’année (souvent vide) occupe l’écran : on part
    // vers la droite, là où l’activité récente se lit.
    el.scrollLeft = el.scrollWidth;
  }, [semaines.length]);

  return (
    <div className="contrib-calendar" data-testid="contrib-calendar">
      <div
        ref={scrollRef}
        className="contrib-calendar__scroll"
        tabIndex={0}
        role="region"
        aria-label={t('home.calendarAria', { year: annee })}
      >
        <div
          className="contrib-calendar__inner"
          style={{ ['--contrib-weeks' as string]: String(semaines.length) }}
        >
          <div className="contrib-calendar__mois">
            <span className="contrib-calendar__coin" aria-hidden="true" />
            {semaines.map((_, col) => {
              const m = mois.find(x => x.col === col);
              return (
                <span
                  key={`m-${col}`}
                  className="contrib-calendar__mois-label"
                  data-first={m ? 'true' : undefined}
                >
                  {m?.label ?? ''}
                </span>
              );
            })}
          </div>

          <div className="contrib-calendar__corps">
            <div className="contrib-calendar__jours" aria-hidden="true">
              {JOURS_LIBELLES.map((libelle, i) => (
                <span key={i} className="contrib-calendar__jour-label">
                  {libelle}
                </span>
              ))}
            </div>

            <div className="contrib-calendar__semaines">
              {semaines.map((semaine, col) => (
                <div key={`w-${col}`} className="contrib-calendar__semaine">
                  {semaine.map((cellule, row) => {
                    if (!cellule) {
                      return (
                        <span
                          key={`e-${col}-${row}`}
                          className="contrib-calendar__cell contrib-calendar__cell--empty"
                        />
                      );
                    }
                    const titre = t('home.dayTitle', {
                      count: cellule.count,
                      date: cellule.date,
                    });
                    return (
                      <span
                        key={cellule.date}
                        className="contrib-calendar__cell"
                        data-level={cellule.niveau}
                        title={titre}
                        onMouseEnter={() => setSurvol(titre)}
                        onMouseLeave={() => setSurvol(null)}
                        onPointerDown={() => setSurvol(titre)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="contrib-calendar__pied">
        <p className="contrib-calendar__hint m-0">{t('home.countsAs')}</p>
        <div className="contrib-calendar__legende" aria-hidden="true">
          <span>{t('home.less')}</span>
          {[0, 1, 2, 3, 4].map(n => (
            <span key={n} className="contrib-calendar__cell" data-level={n} />
          ))}
          <span>{t('home.more')}</span>
        </div>
      </div>

      <p
        className="contrib-calendar__survol m-0"
        role="status"
        aria-live="polite"
      >
        {survol ?? '\u00a0'}
      </p>
    </div>
  );
}
