import { expect, test as base, type Page, type Route } from '@playwright/test';

export const CREDITS_KEY = '@lumiere_user_credits_v1';
export const AI_CONSENT_KEY = '@lumiere_ai_consent';

// Must match INITIAL_CREDITS and CREDITS_PER_GENERATION in src/context/CreditsContext.tsx.
export const WELCOME_CREDITS = 15;
export const DESIGN_COST = 15;

// 1x1 PNG; stands in for every Gemini image so no test ever bills the real API.
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export type GeminiMode = 'ok' | 'error' | 'slow' | 'offline';
export type GeminiMock = { calls: number; mode: GeminiMode };

/** The user every test signs in as; the fake Supabase returns this profile. */
export const TEST_USER = {
  id: '00000000-0000-4000-8000-0000000e2e01',
  email: 'amelie@example.com',
  name: 'Amélie Laurent',
};

export const test = base.extend<{ gemini: GeminiMock; issues: string[]; supabaseAuth: void }>({
  // Stands in for Supabase so "Google ile Giriş Yap" never opens the real Google sign-in.
  // Routes are on the context, so they also cover the sign-in popup window.
  supabaseAuth: [
    async ({ context }, use) => {
      // Send the popup straight back to the app with tokens, as Supabase does after Google approves.
      await context.route('**/auth/v1/authorize**', (route) => {
        const redirectTo = new URL(route.request().url()).searchParams.get('redirect_to') ?? '/';
        const tokens = 'access_token=e2e-access-token&refresh_token=e2e-refresh-token&token_type=bearer';
        return route.fulfill({ status: 302, headers: { location: `${redirectTo}#${tokens}` } });
      });
      await context.route('**/auth/v1/user', (route) =>
        route.fulfill({
          json: { id: TEST_USER.id, email: TEST_USER.email, user_metadata: { full_name: TEST_USER.name } },
        }),
      );
      // Account deletion must never reach the real backend.
      await context.route('**/rest/v1/rpc/delete_user_account', (route) => route.fulfill({ status: 204 }));
      await use();
    },
    { auto: true },
  ],
  // Fails any test that logged a console error, threw, or got a 5xx from our own app.
  issues: [
    async ({ page }, use) => {
      const issues: string[] = [];
      // The browser logs the failures we deliberately inject into the AI mocks.
      const isAiMock = (url: string) => /generativelanguage|\/api\/generate-/.test(url);
      page.on('console', (msg) => {
        if (isAiMock(msg.location().url) || isAiMock(msg.text())) return;
        if (msg.type() === 'error') issues.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => issues.push(`pageerror: ${err.message}`));
      page.on('response', (res) => {
        if (res.status() >= 500 && !isAiMock(res.url())) {
          issues.push(`${res.status()} ${res.url()}`);
        }
      });
      await use(issues);
      expect(issues, 'console errors, page errors or 5xx responses').toEqual([]);
    },
    { auto: true },
  ],
  gemini: [
    async ({ page, context }, use) => {
      const mock: GeminiMock = { calls: 0, mode: 'ok' };
      // Most tests are about generation, not the one-time AI consent sheet, so consent is pre-granted.
      await page.addInitScript((key) => {
        if (window.localStorage.getItem(key) === null) {
          window.localStorage.setItem(key, JSON.stringify({ version: 1, grantedAt: '2026-01-01T00:00:00.000Z' }));
        }
      }, AI_CONSENT_KEY);
      // Applies the current mode to an image request; `ok` builds the successful response.
      const answer = async (route: Route, ok: () => Parameters<Route['fulfill']>[0]) => {
        mock.calls += 1;
        if (mock.mode === 'offline') return route.abort('internetdisconnected');
        if (mock.mode === 'error') {
          return route.fulfill({ status: 500, json: { error: 'Sahte sunucu hatası' } });
        }
        if (mock.mode === 'slow') await new Promise((r) => setTimeout(r, 5000));
        return route.fulfill(ok());
      };
      // Routes are on the context so a second tab is covered too.
      // Direct Gemini calls, used when EXPO_PUBLIC_AI_BACKEND_URL is empty.
      await context.route('**/generativelanguage.googleapis.com/**', (route) =>
        answer(route, () => ({
          json: {
            candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: TINY_PNG } }] } }],
          },
        })),
      );
      // Our AI backend, used when EXPO_PUBLIC_AI_BACKEND_URL is set.
      await context.route('**/api/generate-cake', (route) =>
        answer(route, () => ({ json: { imageUri: `data:image/png;base64,${TINY_PNG}` } })),
      );
      // Recipes always succeed; tests count and break image requests only.
      await context.route('**/api/generate-recipe', (route) =>
        route.fulfill({ json: { recipe: 'Malzemeler\n- 500 g un\n\nYapılışı\n1. Fırını ısıt.' } }),
      );
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
  const greeting = page.getByText(/^(Merhaba|Hoş geldin)/);
  const signInButton = page.getByRole('button', { name: 'Google ile Giriş Yap' });
  await expect(greeting.or(signInButton)).toBeVisible();
  if (await signInButton.isVisible()) await signInButton.click();
  await expect(greeting).toBeVisible();
}

export async function readCredits(page: Page) {
  return Number(await page.evaluate((key) => window.localStorage.getItem(key), CREDITS_KEY));
}

/** Opens the builder from the home carousel's call-to-action (the wedding cake is shown first). */
export async function openBuilder(page: Page, card = 'Düğün Pastası Couture Tasarla') {
  await page.getByRole('button', { name: card }).click();
  await expect(page.getByText('KAÇ KİŞİLİK?')).toBeVisible();
}

/** Fills one field so the form counts as a valid selection. */
export async function choosePalette(page: Page, palette = 'Fildişi & altın') {
  await goToBuilderStep(page, 'Stil');
  await page.getByPlaceholder('Örn: Mor & Lila').fill(palette);
}

/** The builder form is split into Temel / Stil / Lezzet steps. */
export async function goToBuilderStep(page: Page, step: 'Temel' | 'Stil' | 'Lezzet') {
  await page.getByRole('tab', { name: step }).click();
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
