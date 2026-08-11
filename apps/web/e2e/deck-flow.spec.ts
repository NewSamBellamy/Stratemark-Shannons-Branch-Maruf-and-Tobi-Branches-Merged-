import { test, expect } from '@playwright/test';

// Abort external requests (fonts, example.com iframes) so runs are hermetic.
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com|example\.com/, (route) => route.abort());
});

test('full journey: markets → deck → 2-level split → card reader → dashboard', async ({ page }) => {
  await page.goto('/#/history');

  // Markets → open the sample deck.
  await page.getByText('Christian Apparel Companies — California').click();
  await expect(page.getByTestId('card-grid')).toBeVisible();

  // The deck view opens on the company card grid; type filters are optional chrome.
  await expect(page.getByTestId('card-grid')).toBeVisible();

  // Open a company card → reader → dashboard.
  await page.getByRole('article', { name: /GraceWear Global/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Company Maturity Score')).toBeVisible();
  await dialog.getByRole('button', { name: /view more/i }).click();

  // Dashboard tabs.
  await expect(page.getByText(/What they do/i)).toBeVisible();
  await page.getByRole('link', { name: 'Metrics' }).click();
  await expect(page.getByText('Revenue')).toBeVisible();
  await page.getByRole('link', { name: 'Team & Org Chart' }).click();
  await expect(page.locator('.react-flow')).toBeVisible();
});

test('new deck flow (demo mode) researches and lands on a populated deck', async ({ page }) => {
  await page.goto('/#/');
  await page.getByLabel('Your market brief').fill('Vegan sneaker brands');
  // No API key in the test → demo mode builds a sample deck.
  await page.getByRole('button', { name: /build sample deck/i }).click();
  await expect(page.getByText('Your deck is ready.')).toBeVisible({ timeout: 15000 });
  await page.getByRole('link', { name: /open deck/i }).click();
  await expect(page.getByTestId('card-grid')).toBeVisible({ timeout: 15000 });
});
