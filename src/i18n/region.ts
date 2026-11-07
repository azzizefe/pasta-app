import { getLocales, type Locale } from 'expo-localization';
import { isSupportedLanguage, type SupportedLanguage } from './languages';

/**
 * The app language comes from the country the device is set to (Settings → Language & Region),
 * not from a picker. The App Store also uses this country, so it matches where the app was downloaded.
 *
 * Each country lists the languages it may get; the first one is the default. In countries with more
 * than one (Canada, Switzerland, Belgium, Morocco…) the phone's own language wins when it is on that list.
 * Countries not listed get English.
 */
const COUNTRY_LANGUAGES: Record<string, SupportedLanguage[]> = {
  // Turkish (Azerbaijani and Turkmen readers understand Turkish well)
  TR: ['tr'],
  CY: ['en', 'tr'],
  AZ: ['tr', 'ru'],
  TM: ['ru', 'tr'],

  // German
  DE: ['de'], AT: ['de'], LI: ['de'],
  CH: ['de', 'fr', 'it'],
  LU: ['fr', 'de'],

  // French
  FR: ['fr'], MC: ['fr'],
  RE: ['fr'], GP: ['fr'], MQ: ['fr'], GF: ['fr'], YT: ['fr'], PF: ['fr'], NC: ['fr'],
  PM: ['fr'], BL: ['fr'], MF: ['fr'], WF: ['fr'],
  SN: ['fr'], CI: ['fr'], ML: ['fr'], BF: ['fr'], NE: ['fr'], TG: ['fr'], BJ: ['fr'],
  GN: ['fr'], CM: ['fr'], GA: ['fr'], CG: ['fr'], CD: ['fr'], CF: ['fr'], TD: ['fr'],
  MG: ['fr'], BI: ['fr'], HT: ['fr'],
  CA: ['en', 'fr'],
  MU: ['en', 'fr'],

  // Dutch
  NL: ['nl'], SR: ['nl'], AW: ['nl'], CW: ['nl'], SX: ['nl'],
  BE: ['nl', 'fr', 'de'],

  // Spanish
  ES: ['es'], MX: ['es'], AR: ['es'], CO: ['es'], CL: ['es'], PE: ['es'], VE: ['es'],
  EC: ['es'], GT: ['es'], CU: ['es'], BO: ['es'], DO: ['es'], HN: ['es'], PY: ['es'],
  SV: ['es'], NI: ['es'], CR: ['es'], PA: ['es'], UY: ['es'], GQ: ['es'],
  PR: ['es', 'en'],
  US: ['en', 'es'],
  AD: ['es', 'fr'],

  // Italian
  IT: ['it'], SM: ['it'], VA: ['it'],

  // Portuguese
  BR: ['pt'], PT: ['pt'], AO: ['pt'], MZ: ['pt'], CV: ['pt'], GW: ['pt'], ST: ['pt'], TL: ['pt'],

  // Russian and Ukrainian
  RU: ['ru'], BY: ['ru'], KZ: ['ru'], KG: ['ru'], TJ: ['ru'], UZ: ['ru'], AM: ['ru'],
  MD: ['en', 'ru'],
  GE: ['en', 'ru'],
  UA: ['uk', 'ru'],

  // Polish
  PL: ['pl'],

  // Japanese, Korean, Chinese (Simplified only, so Taiwan, Hong Kong and Macau stay on English)
  JP: ['ja'],
  KR: ['ko'],
  CN: ['zh'],
  SG: ['en', 'zh'],

  // Indonesian (Malay readers understand it)
  ID: ['id'],
  MY: ['en', 'id', 'zh'],
  BN: ['en', 'id'],

  // Arabic
  SA: ['ar'], AE: ['ar'], QA: ['ar'], KW: ['ar'], BH: ['ar'], OM: ['ar'], YE: ['ar'],
  IQ: ['ar'], SY: ['ar'], JO: ['ar'], PS: ['ar'], EG: ['ar'], LY: ['ar'], SD: ['ar'],
  MR: ['ar'], SO: ['ar'], DJ: ['ar'], KM: ['ar'],
  MA: ['ar', 'fr'], DZ: ['ar', 'fr'], TN: ['ar', 'fr'], LB: ['ar', 'fr'],
};

/** Region used for date and number formats when the device's country doesn't speak the language. */
const HOME_REGION: Record<SupportedLanguage, string> = {
  tr: 'TR', en: 'US', fr: 'FR', ar: 'SA', de: 'DE', es: 'ES', it: 'IT', pt: 'BR',
  ru: 'RU', uk: 'UA', pl: 'PL', nl: 'NL', ja: 'JP', ko: 'KR', zh: 'CN', id: 'ID',
};

function asSupported(code: string | null | undefined): SupportedLanguage | null {
  const lang = code?.toLowerCase().split('-')[0];
  return lang && isSupportedLanguage(lang) ? lang : null;
}

/** ISO country code from the device's region setting, e.g. "TR". Null on some web browsers. */
export function getDeviceRegion(locales: Locale[] = safeLocales()): string | null {
  const first = locales[0];
  const region = first?.regionCode || first?.languageRegionCode;
  return region ? region.toUpperCase() : null;
}

export function resolveAppLanguage(locales: Locale[] = safeLocales()): SupportedLanguage {
  const deviceLanguage = asSupported(locales[0]?.languageCode);
  const region = getDeviceRegion(locales);

  // No region (some browsers): fall back to the device language.
  if (!region) return deviceLanguage ?? 'en';

  const options = COUNTRY_LANGUAGES[region] ?? ['en'];
  if (deviceLanguage && options.includes(deviceLanguage)) return deviceLanguage;
  return options[0];
}

/** BCP 47 tag for dates and numbers, so they read naturally in the app language. */
export function getFormatLocale(language: SupportedLanguage, region = getDeviceRegion()): string {
  // English formats follow the device's country (en-GB, en-DE…); others use a country that speaks them.
  const speaksIt = language === 'en' || (region && COUNTRY_LANGUAGES[region]?.includes(language));
  const tag = `${language}-${speaksIt && region ? region : HOME_REGION[language]}`;
  // Gregorian calendar: Saudi Arabic locales default to the Hijri calendar otherwise.
  return language === 'ar' ? `${tag}-u-ca-gregory` : tag;
}

/** Budget currency the cake builder starts with, from the device's country. */
const COUNTRY_CURRENCY: Record<string, string> = {
  TR: 'TRY', US: 'USD', GB: 'GBP', AE: 'AED', SA: 'SAR', CA: 'CAD', AU: 'AUD', CH: 'CHF', LI: 'CHF',
  RU: 'RUB',
};
const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV',
  'MT', 'NL', 'PT', 'SI', 'SK', 'MC', 'SM', 'VA', 'AD', 'RE', 'GP', 'MQ', 'GF', 'YT', 'PM',
  'BL', 'MF',
]);

export function getDefaultCurrency(region = getDeviceRegion()): string {
  if (!region) return 'USD';
  if (EURO_COUNTRIES.has(region)) return 'EUR';
  return COUNTRY_CURRENCY[region] ?? 'USD';
}

function safeLocales(): Locale[] {
  try {
    return getLocales();
  } catch {
    return [];
  }
}
