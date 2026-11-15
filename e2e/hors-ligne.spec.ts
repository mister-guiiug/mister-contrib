import { expect, test } from '@playwright/test';

/**
 * LA BUILD SE RECHARGE HORS LIGNE — l'essai que l'audit du 05/11/2026 a fait
 * à la main sur les vingt-trois applications publiées, et qu'aucun test du
 * parc ne faisait.
 */
test.describe('@critical hors ligne', () => {
  test('rouverte sans réseau, l’application démarre et montre le calendrier', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'la coupure des requêtes du service worker n’existe que sous Chromium'
    );

    await page.goto('/');
    await expect(page.getByTestId('contrib-calendar')).toBeVisible();

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
        message: 'un service worker doit contrôler la page avant la coupure',
      })
      .toBe(true);

    await context.setOffline(true);
    await context.route('**/*', route => route.abort('internetdisconnected'));

    await page.reload();

    // ANCRÉ SUR CE QUE SEUL REACT REND. Le h1 statique du HTML ne suffit pas :
    // le calendrier (ou son repli vide) prouve que React a monté.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Mister Contrib'
    );
    await expect(page.getByTestId('contrib-calendar')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-dwc="connection-banner"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});
