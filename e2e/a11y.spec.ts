import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated WCAG 2.x A/AA scan of each screen and UI state (axe-core). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test('login screen has no WCAG violations', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sign in to Sandbox Wallet' })).toBeVisible();
  await scan(page);
});

for (const scenario of ['success', 'empty', 'error'] as const) {
  test(`dashboard (${scenario}) has no WCAG violations`, async ({ page }) => {
    await page.goto(`./?mock=${scenario}`);
    await page.getByLabel('One-time password').fill('123456');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const testId = { success: 'credential-list', empty: 'empty-state', error: 'error-state' }[
      scenario
    ];
    await expect(page.getByTestId(testId)).toBeVisible();
    await scan(page);
  });
}

test('revealed state has no WCAG violations', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('One-time password').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Tap to reveal Aadhaar number' }).click();
  await expect(page.getByRole('button', { name: 'Hide Aadhaar number' })).toBeVisible();
  await scan(page);
});
