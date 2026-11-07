/**
 * The app's languages. The language is picked from the device's country (see region.ts); there is no picker.
 * Translations live in scripts/i18n/<code>.json and are built into phrases.ts.
 *
 * Adding a language: add it here, add scripts/i18n/<code>.json, map its countries in region.ts,
 * add locales/<code>.json (iOS permission texts) and list it in app.json, then add it to
 * RECIPE_LANGUAGES in server/prompt-guard.js.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', isRTL: false },
  { code: 'en', name: 'English', nativeName: 'English', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRTL: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', isRTL: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', isRTL: false },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', isRTL: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', isRTL: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', isRTL: false },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', isRTL: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', isRTL: false },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type LanguageInfo = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_CODES: readonly SupportedLanguage[] = SUPPORTED_LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (LANGUAGE_CODES as readonly string[]).includes(code);
}
