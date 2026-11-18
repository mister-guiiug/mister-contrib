import { useEffect, useMemo, useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Theme } from '@astryxdesign/core/theme';
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
import { ErrorBanner } from '@mister-guiiug/dev-pwa-config/react/error-banner';
import { SkeletonGroup } from '@mister-guiiug/dev-pwa-config/react/skeleton';
import { useThemeContext } from '@mister-guiiug/dev-pwa-config/react/theme-provider';
import { defaultThemeSlug, themes } from '../../astryx-themes.ts';
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
 * Peint avec Astryx (thème Butter) — le reste de l’app reste sur le socle.
 * Aucune forge n’est nommée. Garde l’accroche et le pied de page famille.
 */
export function HomeScreen() {
  const { t, fmt } = useI18n();
  const themeCtx = useThemeContext();
  const astryxMode =
    themeCtx?.resolved === 'dark' || themeCtx?.resolved === 'light'
      ? themeCtx.resolved
      : 'system';
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
    <Theme theme={themes[defaultThemeSlug]} mode={astryxMode}>
      <Stack gap={4} width="100%" className="contrib-home">
        <Stack gap={1}>
          <Text type="supporting" display="block">
            {t('app.tagline')}
          </Text>
          {age ? (
            <Text
              type="supporting"
              size="sm"
              display="block"
              data-testid="releve-frais"
            >
              {t('home.verified', { when: age })}
              {donnees?.partiel ? ` · ${t('home.partial')}` : null}
            </Text>
          ) : null}
        </Stack>

        {erreur ? <ErrorBanner message={erreur} className="mb-4" /> : null}

        {!donnees && !erreur ? (
          <SkeletonGroup label={t('home.loading')} lines={4} className="mt-2" />
        ) : null}

        {donnees ? (
          <>
            <Grid
              columns={2}
              gap={3}
              width="100%"
              maxWidth={448}
              className="contrib-home__stats"
              aria-label={t('home.title')}
            >
              <Card padding={3} elevation="low">
                <Stack gap={1}>
                  <Text
                    size="3xl"
                    weight="bold"
                    display="block"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmt.number(donnees.contributions)}
                  </Text>
                  <Heading level={2}>
                    {t('home.contributionsLabel', { year: donnees.annee })}
                  </Heading>
                </Stack>
              </Card>
              <Card padding={3} elevation="low">
                <Stack gap={1}>
                  <Text
                    size="3xl"
                    weight="bold"
                    display="block"
                    data-testid="depots-total"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmt.number(donnees.depots)}
                  </Text>
                  <Heading level={2}>{t('home.reposLabel')}</Heading>
                </Stack>
              </Card>
            </Grid>

            <ContributionCalendar
              annee={donnees.annee}
              jours={donnees.jours}
              partiel={donnees.partiel}
            />

            <Grid columns={{ minWidth: 280, max: 2 }} gap={3} width="100%">
              <Card padding={3} aria-labelledby="contrib-rythme-titre">
                <Stack gap={3}>
                  <Heading level={2} id="contrib-rythme-titre">
                    {t('home.weekdayTitle')}
                  </Heading>
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
                </Stack>
              </Card>

              <Card padding={3} aria-labelledby="contrib-pics-titre">
                <Stack gap={3}>
                  <Heading level={2} id="contrib-pics-titre">
                    {t('home.peaksTitle', { year: donnees.annee })}
                  </Heading>
                  {pics.length === 0 ? (
                    <Text type="supporting" display="block">
                      {t('home.peaksEmpty')}
                    </Text>
                  ) : (
                    <ol className="contrib-pics m-0">
                      {pics.map(p => (
                        <li key={p.date} className="contrib-pics__item">
                          <span>
                            {fmt.date(new Date(`${p.date}T12:00:00Z`))}
                          </span>
                          <b>{fmt.number(p.count)}</b>
                        </li>
                      ))}
                    </ol>
                  )}
                </Stack>
              </Card>
            </Grid>
          </>
        ) : null}

        <AppFooter repoUrl={REPO_URL} issues className="mt-8" />
      </Stack>
    </Theme>
  );
}
