import { useEffect, useMemo, useState } from 'react';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { ageRelatif, picsActivite, rythmeSemaine } from './calendar.ts';
import { ContributionCalendar } from './ContributionCalendar.tsx';
import { loadDonnees } from './loadDonnees.ts';
import type { Donnees } from './types.ts';

function vide(annee = new Date().getFullYear()): Donnees {
  return {
    genere: null,
    annee,
    contributions: 0,
    depots: 0,
    jours: [],
  };
}

const DOW_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;

/**
 * Accueil public : totaux + calendrier consolidé + rythme + pics.
 * Aucune forge n'est nommée. Garde l'accroche et le pied de page famille.
 */
export function HomeScreen() {
  const { t, fmt } = useI18n();
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void loadDonnees(ac.signal)
      .then(d => {
        setDonnees(d);
        setErreur(null);
      })
      .catch(err => {
        if (ac.signal.aborted) return;
        // Hors ligne / JSON absent : on garde un calendrier vide plutôt qu'un
        // écran mort — le service worker peut servir l'app sans l'instantané.
        setErreur(err instanceof Error ? err.message : String(err));
        setDonnees(prev => prev ?? vide());
      });
    return () => ac.abort();
  }, []);

  const age = ageRelatif(donnees?.genere ?? null);
  const rythme = useMemo(
    () => (donnees ? rythmeSemaine(donnees.jours) : []),
    [donnees]
  );
  const pics = useMemo(
    () => (donnees ? picsActivite(donnees.jours, 5) : []),
    [donnees]
  );
  const maxRythme = Math.max(1, ...rythme.map(r => r.moyenne));

  return (
    <div className="contrib-home">
      <p className="contrib-home__tagline mt-0 mb-2">{t('app.tagline')}</p>

      {age ? (
        <p
          className="contrib-home__meta mt-0 mb-5 text-sm"
          data-testid="releve-frais"
        >
          {t('home.verified', { when: age })}
          {donnees?.partiel ? ` · ${t('home.partial')}` : null}
        </p>
      ) : (
        <div className="mb-5" />
      )}

      {erreur ? <ErrorBanner message={erreur} className="mb-4" /> : null}

      {!donnees && !erreur ? (
        <SkeletonGroup label={t('home.loading')} lines={4} className="mt-2" />
      ) : null}

      {donnees ? (
        <>
          <div className="contrib-home__stats" aria-label={t('home.title')}>
            <div className="contrib-home__stat">
              <p className="contrib-home__stat-value m-0">
                {fmt.number(donnees.contributions)}
              </p>
              <h2 className="contrib-home__stat-label m-0">
                {t('home.contributionsLabel', { year: donnees.annee })}
              </h2>
            </div>
            <div className="contrib-home__stat">
              <p
                className="contrib-home__stat-value m-0"
                data-testid="depots-total"
              >
                {fmt.number(donnees.depots)}
              </p>
              <p className="contrib-home__stat-label m-0">
                {t('home.reposLabel')}
              </p>
            </div>
          </div>

          <ContributionCalendar
            annee={donnees.annee}
            jours={donnees.jours}
            partiel={donnees.partiel}
          />

          <div className="contrib-home__annexes">
            <section
              className="contrib-home__annexe"
              aria-labelledby="contrib-rythme-titre"
            >
              <h2
                id="contrib-rythme-titre"
                className="contrib-home__annexe-titre"
              >
                {t('home.weekdayTitle')}
              </h2>
              <div
                className="contrib-rythme"
                role="img"
                aria-label={t('home.weekdayAria')}
              >
                {rythme.map(r => (
                  <div key={r.dow} className="contrib-rythme__col">
                    <div
                      className="contrib-rythme__bar"
                      style={{
                        height: `${Math.max(4, Math.round((r.moyenne / maxRythme) * 72))}px`,
                      }}
                      title={t('home.weekdayBar', {
                        day: DOW_SHORT[r.dow]!,
                        count: fmt.number(Math.round(r.moyenne)),
                      })}
                    />
                    <span className="contrib-rythme__label">
                      {DOW_SHORT[r.dow]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="contrib-home__annexe"
              aria-labelledby="contrib-pics-titre"
            >
              <h2
                id="contrib-pics-titre"
                className="contrib-home__annexe-titre"
              >
                {t('home.peaksTitle', { year: donnees.annee })}
              </h2>
              {pics.length === 0 ? (
                <p className="contrib-home__annexe-vide m-0">
                  {t('home.peaksEmpty')}
                </p>
              ) : (
                <ol className="contrib-pics m-0">
                  {pics.map(p => (
                    <li key={p.date} className="contrib-pics__item">
                      <span>{fmt.date(new Date(`${p.date}T12:00:00Z`))}</span>
                      <b>{fmt.number(p.count)}</b>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      ) : null}

      <AppFooter repoUrl={REPO_URL} issues className="mt-8" />
    </div>
  );
}
