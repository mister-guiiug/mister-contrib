import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useI18n } from '../../i18n/index.ts';
import {
  dernierJourActif,
  grilleAnnee,
  grilleRecente,
  type Cellule,
} from './calendar.ts';
import type { Jour } from './types.ts';

type Vue = 'recente' | 'annee';

type Props = {
  annee: number;
  jours: Jour[];
  partiel?: boolean;
};

const JOURS_LIBELLES = ['', 'Lun', '', 'Mer', '', 'Ven', ''] as const;

function usePrefereMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 39.99rem)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 39.99rem)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return mobile;
}

/**
 * Calendrier type contribution graph.
 * Mobile : 13 semaines par défaut (cellules lisibles), bascule vers l’année.
 * Détail du jour ancré sous la grille ; cases grisées après la coupure partielle.
 */
export function ContributionCalendar({ annee, jours, partiel }: Props) {
  const { t, fmt } = useI18n();
  const mobile = usePrefereMobile();
  const [vue, setVue] = useState<Vue>('recente');
  const vueEffective: Vue = mobile ? vue : 'annee';

  const { semaines, mois } = useMemo(
    () =>
      vueEffective === 'recente'
        ? grilleRecente(annee, jours, 13)
        : grilleAnnee(annee, jours),
    [annee, jours, vueEffective]
  );

  const coupure = useMemo(
    () => (partiel ? dernierJourActif(jours) : null),
    [partiel, jours]
  );

  const [selection, setSelection] = useState<Cellule | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, [semaines.length, vueEffective]);

  useEffect(() => {
    // Premier jour actif récent comme détail initial, sinon dernière cellule.
    const plates = semaines.flat().filter((c): c is Cellule => c !== null);
    const actif = [...plates].reverse().find(c => c.count > 0) ?? null;
    setSelection(actif);
  }, [semaines]);

  const detail = selection
    ? t('home.dayDetail', {
        count: fmt.number(selection.count),
        date: fmt.date(new Date(`${selection.date}T12:00:00Z`)),
      })
    : t('home.dayDetailEmpty');

  return (
    <Card
      padding={3}
      elevation="low"
      width="100%"
      className="contrib-calendar"
      data-testid="contrib-calendar"
      data-vue={vueEffective}
    >
      <Stack gap={3} width="100%">
        {mobile ? (
          <div className="contrib-calendar__vues">
            <SegmentedControl
              value={vue}
              onChange={v => setVue(v as Vue)}
              label={t('home.viewGroup')}
              size="sm"
            >
              <SegmentedControlItem
                value="recente"
                label={t('home.viewRecent')}
              />
              <SegmentedControlItem value="annee" label={t('home.viewYear')} />
            </SegmentedControl>
          </div>
        ) : null}

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
                      const apresCoupure =
                        coupure !== null && cellule.date > coupure;
                      const titre = t('home.dayTitle', {
                        count: cellule.count,
                        date: cellule.date,
                      });
                      const selected = selection?.date === cellule.date;
                      return (
                        <button
                          type="button"
                          key={cellule.date}
                          className="contrib-calendar__cell"
                          data-level={apresCoupure ? 0 : cellule.niveau}
                          data-partial={apresCoupure ? 'true' : undefined}
                          data-selected={selected ? 'true' : undefined}
                          aria-label={titre}
                          aria-pressed={selected}
                          onClick={() => setSelection(cellule)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="contrib-calendar__detail"
          role="status"
          aria-live="polite"
          data-testid="contrib-day-detail"
        >
          <Text weight="semibold" display="block">
            {detail}
          </Text>
        </div>

        <div className="contrib-calendar__pied">
          <Text type="supporting" size="sm" display="block">
            {t('home.countsAs')}
          </Text>
          <div className="contrib-calendar__legende" aria-hidden="true">
            <Text type="supporting" size="2xs">
              {t('home.less')}
            </Text>
            {[0, 1, 2, 3, 4].map(n => (
              <span key={n} className="contrib-calendar__cell" data-level={n} />
            ))}
            <Text type="supporting" size="2xs">
              {t('home.more')}
            </Text>
          </div>
        </div>
      </Stack>
    </Card>
  );
}
