import { expect, test } from '@playwright/test';

/**
 * Le SMOKE : ce qui doit marcher pour qu'une livraison ait un sens.
 *
 * Le tag `@critical` est celui que la CI de la famille exécute
 * (`playwright test --grep @critical`) : une spec sans lui n'est PAS jouée en
 * intégration continue, et le workflow rapporte « No tests found » sans
 * échouer. C'est une panne silencieuse que le parc a déjà connue.
 *
 * Ces tests passent sur un BUILD de production, service worker compris.
 */
test.describe('@critical le cadre', () => {
  test("l'accueil s'ouvre et porte le nom de l'app", async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Mister Contrib'
    );
    await expect(page.getByTestId('contrib-calendar')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toContainText(
      'contributions'
    );
    await expect(page.getByTestId('depots-total')).toBeVisible();
    await expect(page.locator('.contrib-home__stats')).toBeVisible();
  });

  test('le calendrier ne nomme aucune forge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('contrib-calendar')).toBeVisible();
    const corps = await page.locator('main').innerText();
    expect(corps).not.toMatch(/GitHub|GitLab|Azure|Bitbucket/i);
  });

  test('la navigation atteint les quatre destinations', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Réglages' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );

    await page.getByRole('link', { name: 'Compte' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compte');

    await page.getByRole('link', { name: 'À propos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'À propos'
    );
  });

  test('sans backend, l’écran de compte le DIT au lieu de disparaître', async ({
    page,
  }) => {
    // La propriété que la variante Supabase ne doit pas casser : l'application
    // reste entière sans configuration. Un écran masqué par une condition
    // finit par diverger de celui qui s'affiche, et personne ne le voit avant
    // la mise en service.
    await page.goto('/compte');
    await expect(page.getByText('Mode local')).toBeVisible();

    // ET LA ZONE DANGEREUSE N'EXISTE PAS. Sans backend distant, il n'y a pas
    // de compte à effacer : un bouton « Supprimer mon compte » qui n'efface
    // rien serait pire que son absence. C'est la seule moitié de l'ADR 0009
    // qu'un e2e sans configuration puisse prouver — l'effacement lui-même est
    // prouvé en pgTAP, sur une base réelle.
    await expect(page.getByTestId('zone-dangereuse')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Supprimer mon compte' })
    ).toHaveCount(0);
  });

  test('un lien profond rafraîchi sert l’app, pas la page d’erreur', async ({
    page,
  }) => {
    // Le repli SPA de `spaFallbackPlugin` : sans lui, GitHub Pages sert sa
    // propre page « File not found » sur un lien partagé ouvert à froid.
    // Quatre applications de la famille en souffraient en production.
    await page.goto('/reglages');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Réglages'
    );
  });

  test('la fiche d’installation se propose quand le navigateur le permet', async ({
    page,
  }) => {
    await page.goto('/a-propos');
    // Aucun navigateur n'émet `beforeinstallprompt` sur un site de test : on
    // le simule, avec la forme que `useInstallPrompt` du socle attend.
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
    await expect(
      page.getByRole('region', { name: 'Installer l’application' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer' })).toBeVisible();
  });

  test('« Signaler un problème » part avec la version et l’écran', async ({
    page,
  }) => {
    // DEPUIS « À PROPOS », et plus depuis les réglages : le pied de page a
    // quitté la coquille pour l'accueil et cet écran, les deux seuls que la
    // règle famille du 06/09/2026 autorise. Rendu hors des routes, il suivait
    // chaque écran — donc aussi ceux qui n'ont rien à en faire.
    await page.goto('/a-propos');
    const lien = page.getByRole('link', { name: 'Signaler un problème' });
    await expect(lien).toHaveAttribute(
      'href',
      /\/issues\/new\?template=bug\.yml/
    );
    const url = new URL((await lien.getAttribute('href')) ?? '');
    // La version injectée par `vite-version` au build, et l'écran courant :
    // ce qu'un rapport n'a jamais quand on le demande après coup.
    expect(url.searchParams.get('version')).toMatch(/^v\d+\.\d+\.\d+/);
    expect(url.searchParams.get('environnement')).toContain('écran ');
    expect(url.searchParams.get('environnement')).toContain('/a-propos');
  });

  test('les trois liens de la famille : sur l’accueil et « À propos », nulle part ailleurs', async ({
    page,
  }) => {
    // La règle famille du 06/09/2026, vue de l'écran. `pwa-doctor` la lit dans
    // le code (`liens-famille`) ; ce test la lit dans le rendu, où un pied de
    // page remonté dans la coquille se verrait tout de suite.
    //
    // TOUT EST PORTÉ PAR LE PIED DE PAGE, et les noms sont EXACTS : la grille
    // des applications sœurs rend seize liens « Code source de <app> », qu'une
    // recherche par sous-chaîne ramasse aussi.
    const pied = page.locator('[data-dwc="app-footer"]');
    const liens = ['Code source', 'M’offrir un café', 'Signaler un problème'];

    for (const route of ['/', '/a-propos']) {
      await page.goto(route);
      await expect(pied, `pied de page attendu sur ${route}`).toBeVisible();
      for (const nom of liens) {
        await expect(
          pied.getByRole('link', { name: nom, exact: true }),
          `${nom} attendu une fois sur ${route}`
        ).toHaveCount(1);
      }
    }

    for (const route of ['/reglages', '/compte']) {
      await page.goto(route);
      // L'écran est bien rendu : sans cette ancre, un test qui ne trouve rien
      // passerait aussi sur une page blanche.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(pied, `pied de page interdit sur ${route}`).toHaveCount(0);
      for (const nom of liens) {
        await expect(
          page.getByRole('link', { name: nom, exact: true }),
          `${nom} ne doit pas être sur ${route}`
        ).toHaveCount(0);
      }
    }
  });

  test('la langue bascule, et le cadre suit', async ({ page }) => {
    await page.goto('/reglages');

    // `SegmentedControl` du socle expose un `tablist`, pas un groupe de
    // boutons radio : le rôle se lit dans le rendu, il ne se devine pas.
    await page.getByRole('tab', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Settings'
    );
    // `LabelsProvider` est posé par le fournisseur i18n : les libellés des
    // composants du socle suivent sans que l'app ait rien à câbler.
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
