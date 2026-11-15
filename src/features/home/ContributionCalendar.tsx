import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { grilleAnnee } from './calendar.ts';
import type { Jour } from './types.ts';

type Props = {
  annee: number;
  jours: Jour[];
};

const JOURS_LIBELLES = ['', 'Lun', '', 'Mer', '', 'Ven', ''] as const;

/**
 * Calendrier type contribution graph : 7 lignes × semaines, légende Less→More.
 * Cellules en `span` (pas de boutons) pour rester compatible avec `role="img"`.
 */
export function ContributionCalendar({ annee, jours }: Props) {
  const { t } = useI18n();
  const { semaines, mois } = useMemo(
    () => grilleAnnee(annee, jours),
    [annee, jours]
  );
  const [survol, setSurvol] = useState<string | null>(null);
  const cell = '0.72rem';
  const gap = '0.18rem';

  return (
    <div className="contrib-calendar" data-testid="contrib-calendar">
      <div
        className="contrib-calendar__scroll"
        tabIndex={0}
        role="region"
        aria-label={t('home.calendarAria', { year: annee })}
      >
        <div
          className="contrib-calendar__mois"
          style={{
            marginLeft: '1.75rem',
            display: 'grid',
            gridTemplateColumns: `repeat(${semaines.length}, ${cell})`,
            columnGap: gap,
            marginBottom: '0.35rem',
          }}
        >
          {semaines.map((_, col) => {
            const m = mois.find(x => x.col === col);
            return (
              <span key={`m-${col}`} className="contrib-calendar__mois-label">
                {m?.label ?? ''}
              </span>
            );
          })}
        </div>

        <div className="contrib-calendar__corps">
          <div
            className="contrib-calendar__jours"
            style={{
              display: 'grid',
              gridTemplateRows: `repeat(7, ${cell})`,
              rowGap: gap,
              marginRight: '0.35rem',
              width: '1.4rem',
            }}
          >
            {JOURS_LIBELLES.map((libelle, i) => (
              <span key={i} className="contrib-calendar__jour-label">
                {libelle}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${semaines.length}, ${cell})`,
              columnGap: gap,
            }}
          >
            {semaines.map((semaine, col) => (
              <div
                key={`w-${col}`}
                style={{
                  display: 'grid',
                  gridTemplateRows: `repeat(7, ${cell})`,
                  rowGap: gap,
                }}
              >
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
                    />
                  );
                })}
              </div>
            ))}
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

      {survol ? (
        <p className="contrib-calendar__survol m-0" role="status">
          {survol}
        </p>
      ) : null}
    </div>
  );
}
