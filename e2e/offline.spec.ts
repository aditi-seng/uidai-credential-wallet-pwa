import { expect, Page, test } from '@playwright/test';

/**
 * End-to-end check of Part 3: the Service Worker serves the last known
 * GET /api/credentials response from Cache Storage when the network drops.
 */

async function login(page: Page) {
  await page.goto('./');
  await page.getByLabel('One-time password').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your credentials' })).toBeVisible();
}

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      );
    }
  });
}

test('serves the cached credential list when offline', async ({ page, context }) => {
  await login(page);
  await waitForServiceWorkerControl(page);

  // First online load through the SW populates Cache Storage.
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('credential-list').getByRole('listitem')).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(async () => (await caches.open('wallet-api-v1')).keys().then((k) => k.length)),
    )
    .toBe(1);

  // Drop the network and refresh.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh' }).click();

  await expect(page.getByText("You're offline.")).toBeVisible();
  await expect(page.getByTestId('credential-list').getByRole('listitem')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: 'Aadhaar (Mock)' })).toBeVisible();

  // Sensitive values are still masked when served from cache.
  await expect(page.getByTestId('sdm-value').first()).toHaveText('XXXX-XXXX-1234');
});

test('shows the Error state when offline with nothing cached', async ({ page, context }) => {
  await login(page);
  await waitForServiceWorkerControl(page);
  await page.evaluate(() => caches.delete('wallet-api-v1'));

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh' }).click();

  await expect(page.getByRole('alert')).toContainText('offline');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('logout clears the offline credential cache', async ({ page }) => {
  await login(page);
  await waitForServiceWorkerControl(page);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => (await caches.open('wallet-api-v1')).keys().then((k) => k.length)),
    )
    .toBe(1);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Sandbox Wallet' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => caches.has('wallet-api-v1'))).toBe(false);
});

test('reveal works end-to-end and re-masks after 10s', async ({ page }) => {
  await page.clock.install();
  await login(page);

  const card = page.getByRole('article', { name: 'Aadhaar (Mock)' });
  await card.getByRole('button', { name: 'Tap to reveal Aadhaar number' }).click();
  await expect(card.getByTestId('sdm-value')).toHaveText('9876-5432-1234');

  await page.clock.runFor(10_000);
  await expect(card.getByTestId('sdm-value')).toHaveText('XXXX-XXXX-1234');
});
