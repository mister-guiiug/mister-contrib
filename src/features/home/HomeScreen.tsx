import { useEffect, useState } from 'react';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useI18n } from '../../i18n/index.ts';
import { REPO_URL } from '../../app/links.ts';
import { ageRelatif } from './calendar.ts';
import { ContributionCalendar } from './ContributionCalendar.tsx';
import { loadDonnees } from './loadDonnees.ts';
import type { Donnees } from './types.ts';

/**
 * Accueil public : totaux + calendrier consolidé. Aucune forge n'est nommée.
 * Garde l'accroche `app.tagline` et le pied de page famille.
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
        setErreur(err instanceof Error ? err.message : String(err));
      });
    return () => ac.abort();
  }, []);

  const age = ageRelatif(donnees?.genere ?? null);

  return (
    <>
      <p className="mt-0 mb-2" style={{ color: 'var(--dwc-text-soft)' }}>
        {t('app.tagline')}
      </p>

      {age ? (
        <p
          className="mt-0 mb-6 text-sm"
          style={{ color: 'var(--dwc-text-soft)' }}
          data-testid="releve-frais"
        >
          {t('home.verified', { when: age })}
          {donnees?.partiel ? ` · ${t('home.partial')}` : null}
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {erreur ? <ErrorBanner message={erreur} className="mb-4" /> : null}

      {!donnees && !erreur ? (
        <SkeletonGroup label={t('home.loading')} lines={4} className="mt-2" />
      ) : null}

      {donnees ? (
        <>
          <h2 className="mt-0 mb-1 text-lg font-semibold">
            {t('home.contributionsInYear', {
              count: fmt.number(donnees.contributions),
              year: donnees.annee,
            })}
          </h2>
          <p
            className="mt-0 mb-4 text-sm"
            style={{ color: 'var(--dwc-text-soft)' }}
            data-testid="depots-total"
          >
            {t('home.repos', { count: fmt.number(donnees.depots) })}
          </p>

          <ContributionCalendar annee={donnees.annee} jours={donnees.jours} />
        </>
      ) : null}

      <AppFooter repoUrl={REPO_URL} issues className="mt-8" />
    </>
  );
}
