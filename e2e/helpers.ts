import { expect, test as base, type Page } from '@playwright/test';

export const CREDITS_KEY = '@lumiere_user_credits_v1';

// 1x1 PNG; stands in for every Gemini image so no test ever bills the real API.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export type GeminiMode = 'ok' | 'error' | 'slow' | 'offline';
export type GeminiMock = { calls: number; mode: GeminiMode };

export const test = base.extend<{ gemini: GeminiMock; issues: string[] }>({
  // Fails any test that logged a console error, threw, or got a 5xx from our own app.
  issues: [
    async ({ page }, use) => {
      const issues: string[] = [];
      page.on('console', (msg) => {
        // The browser logs the failures we deliberately inject into the Gemini mock.
        if (msg.location().url.includes('generativelanguage')) return;
        if (msg.type() === 'error') issues.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => issues.push(`pageerror: ${err.message}`));
      page.on('response', (res) => {
        if (res.status() >= 500 && !res.url().includes('generativelanguage')) {
          issues.push(`${res.status()} ${res.url()}`);
        }
      });
      await use(issues);
      expect(issues, 'console errors, page errors or 5xx responses').toEqual([]);
    },
    { auto: true },
  ],
  gemini: [
    async ({ page }, use) => {
      const mock: GeminiMock = { calls: 0, mode: 'ok' };
      await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
        mock.calls += 1;
        if (mock.mode === 'offline') return route.abort('internetdisconnected');
        if (mock.mode === 'error') {
          return route.fulfill({ status: 500, json: { error: { message: 'Sahte sunucu hatası' } } });
        }
        if (mock.mode === 'slow') await new Promise((r) => setTimeout(r, 5000));
        return route.fulfill({
          status: 200,
          json: {
            candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: TINY_PNG } }] } }],
          },
        });
      });
      await use(mock);
    },
    { auto: true },
  ],
});

export { expect };

/** Seeds a starting balance once (later reloads keep whatever the app saved). */
export async function seedCredits(page: Page, credits: number) {
  await page.addInitScript(
    ([key, value]) => {
      if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
    },
    [CREDITS_KEY, String(credits)],
  );
}

/** Signs in, or just lands on home when a saved session already exists (e.g. a second tab). */
export async function signIn(page: Page) {
  await page.goto('/');
  const greeting = page.getByText('Merhaba Amélie,');
  const signInButton = page.getByRole('button', { name: 'Sign in with Google' });
  await expect(greeting.or(signInButton)).toBeVisible();
  if (await signInButton.isVisible()) await signInButton.click();
  await expect(greeting).toBeVisible();
}

export async function readCredits(page: Page) {
  return Number(await page.evaluate((key) => window.localStorage.getItem(key), CREDITS_KEY));
}

export async function openBuilder(page: Page, card = 'Düğün Pastası Oluştur') {
  await page.getByRole('button', { name: card }).click();
  await expect(page.getByText('KAÇ KİŞİLİK?')).toBeVisible();
}

/** Fills one field so the form counts as a valid selection. */
export async function choosePalette(page: Page, palette = 'Fildişi & altın') {
  await page.getByPlaceholder('Örn: Mor & Lila').fill(palette);
}

export function generateButton(page: Page) {
  return page.getByRole('button', { name: /(Tasarımı Oluştur|Fırına Ver ve Tasarla), \d+ Kredi/ });
}

/**
 * Runs an action that must raise a browser dialog matching `text`, answering it as it opens.
 * alert()/confirm() block the page, so the action only settles once the dialog is answered.
 */
export async function expectDialog(page: Page, action: () => Promise<unknown>, text: RegExp, accept = true) {
  let message: string | null = null;
  page.once('dialog', async (d) => {
    message = d.message();
    await (accept ? d.accept() : d.dismiss());
  });
  await action();
  await expect.poll(() => message, { timeout: 5_000 }).toMatch(text);
}
