import type { Page } from '@playwright/test';
import { expect, openCollection, seedSavedCakes, signIn, test } from './helpers';

/** Card titles in the order the home screen shows them. */
const order = (page: Page) =>
  page
    .locator('[data-testid^="recent-cake-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

const like = (page: Page, title: string) => page.getByRole('button', { name: `${title} beğen`, exact: true }).click();
const unlike = (page: Page, title: string) =>
  page.getByRole('button', { name: `${title} beğenildi`, exact: true }).click();

test.describe('F11 son tasarımlar', () => {
  test('F11-E1 tasarım yokken boş durum gösterilir', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText('Son Tasarımların')).toBeVisible();
    await expect(page.getByText('Henüz bir tasarımın yok')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tüm tasarımları gör' })).toHaveCount(0);
  });

  test('F11-H1 en yeni tasarım en üstte, beğenilen en üste çıkar ve kalıcıdır', async ({ page }) => {
    await seedSavedCakes(page, ['Pasta A', 'Pasta B', 'Pasta C']);
    await signIn(page);
    await expect.poll(() => order(page)).toEqual(['Pasta C', 'Pasta B', 'Pasta A']);

    await like(page, 'Pasta A');
    await expect.poll(() => order(page)).toEqual(['Pasta A', 'Pasta C', 'Pasta B']);

    // The most recently liked cake goes first.
    await like(page, 'Pasta B');
    await expect.poll(() => order(page)).toEqual(['Pasta B', 'Pasta A', 'Pasta C']);

    // Unliking drops it back among the others, by date.
    await unlike(page, 'Pasta B');
    await expect.poll(() => order(page)).toEqual(['Pasta A', 'Pasta C', 'Pasta B']);

    await page.reload();
    await expect.poll(() => order(page)).toEqual(['Pasta A', 'Pasta C', 'Pasta B']);
    await expect(page.getByRole('button', { name: 'Pasta A beğenildi', exact: true })).toBeVisible();

    // The collection shows the like too.
    await openCollection(page);
    await page.getByText('Favoriler').first().click();
    await expect(page.getByText('Pasta A').last()).toBeVisible();
  });

  test('F11-H2 en fazla altı tasarım gösterilir, Tümü koleksiyonu açar', async ({ page }) => {
    await seedSavedCakes(page, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
    await signIn(page);
    await expect.poll(() => order(page)).toEqual(['P8', 'P7', 'P6', 'P5', 'P4', 'P3']);
    await page.getByRole('button', { name: 'Tüm tasarımları gör' }).click();
    await expect(page.getByText('Koleksiyonum')).toBeVisible();
  });

  test('F11-H3 karta dokununca tasarım detayı açılır', async ({ page }) => {
    await seedSavedCakes(page, ['Pasta A']);
    await signIn(page);
    await page.getByTestId('recent-cake-seed_0').click();
    await expect(page.getByRole('button', { name: 'Tasarımı Düzenle' })).toBeVisible();
  });
});
