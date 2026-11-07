import { PHRASES, PHRASE_LANGUAGES } from './phrases';
import type { SupportedLanguage } from './languages';

/**
 * Phrase-based translation: the Turkish text in the code is the key.
 *
 *   tx('Kaydet')                                   → "Save" in English
 *   tx('Bu tasarım için {cost} kredi gerekiyor', { cost: 15 })
 *
 * Components should call useTx() (from LanguageContext) so they re-render when the
 * language changes. Plain tx() is for code outside React (alerts, services).
 * Missing phrases fall back to English, then to the Turkish source.
 */

type Vars = Record<string, string | number | null | undefined>;

const table = new Map<string, readonly string[]>(PHRASES.map(([tr, ...rest]) => [tr, rest]));
const ENGLISH = PHRASE_LANGUAGES.indexOf('en');

let current: SupportedLanguage = 'tr';
let currentIndex = -1;
let currentLocale = 'tr-TR';

export function setTxLanguage(lang: SupportedLanguage, formatLocale: string) {
  current = lang;
  currentIndex = PHRASE_LANGUAGES.indexOf(lang);
  currentLocale = formatLocale;
}

export function getTxLanguage(): SupportedLanguage {
  return current;
}

/** BCP 47 tag for dates and numbers in the app language, for code outside React. */
export function getTxLocale(): string {
  return currentLocale;
}

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined || vars[name] === null ? match : String(vars[name]),
  );
}

export function tx(source: string, vars?: Vars): string {
  if (current === 'tr') return fill(source, vars);
  const row = table.get(source);
  const translated = row ? row[currentIndex] || row[ENGLISH] : undefined;
  return fill(translated || source, vars);
}
