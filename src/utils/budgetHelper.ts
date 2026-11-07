import { BudgetTier } from '../types/savedCake';
import { tx } from '../i18n/tx';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  flag: string;
  name: string;
  minBasePrice: number;     // 2 kişilik butik taban açılış fiyatı
  minPerPerson: number;     // Kişi başı minimum taban maliyeti
  luxuryPerPerson: number;  // Kişi başı lüks haute pâtisserie eşiği
  placeholder: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'TRY',
    symbol: '₺',
    flag: '🇹🇷',
    name: 'Türk Lirası',
    minBasePrice: 800,
    minPerPerson: 250,
    luxuryPerPerson: 650,
    placeholder: '1500',
  },
  {
    code: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    name: 'US Dollar',
    minBasePrice: 60,
    minPerPerson: 10,
    luxuryPerPerson: 25,
    placeholder: '120',
  },
  {
    code: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    name: 'Euro',
    minBasePrice: 55,
    minPerPerson: 9,
    luxuryPerPerson: 22,
    placeholder: '100',
  },
  {
    code: 'GBP',
    symbol: '£',
    flag: '🇬🇧',
    name: 'British Pound',
    minBasePrice: 50,
    minPerPerson: 8,
    luxuryPerPerson: 20,
    placeholder: '90',
  },
  {
    code: 'AED',
    symbol: 'د.إ',
    flag: '🇦🇪',
    name: 'UAE Dirham',
    minBasePrice: 250,
    minPerPerson: 40,
    luxuryPerPerson: 100,
    placeholder: '400',
  },
  {
    code: 'SAR',
    symbol: '﷼',
    flag: '🇸🇦',
    name: 'Saudi Riyal',
    minBasePrice: 250,
    minPerPerson: 40,
    luxuryPerPerson: 100,
    placeholder: '400',
  },
  {
    code: 'CAD',
    symbol: 'C$',
    flag: '🇨🇦',
    name: 'Canadian Dollar',
    minBasePrice: 80,
    minPerPerson: 14,
    luxuryPerPerson: 35,
    placeholder: '140',
  },
  {
    code: 'AUD',
    symbol: 'A$',
    flag: '🇦🇺',
    name: 'Australian Dollar',
    minBasePrice: 90,
    minPerPerson: 15,
    luxuryPerPerson: 38,
    placeholder: '150',
  },
  {
    code: 'CHF',
    symbol: 'CHF',
    flag: '🇨🇭',
    name: 'Swiss Franc',
    minBasePrice: 60,
    minPerPerson: 11,
    luxuryPerPerson: 28,
    placeholder: '120',
  },
  {
    code: 'RUB',
    symbol: '₽',
    flag: '🇷🇺',
    name: 'Russian Ruble',
    minBasePrice: 2500,
    minPerPerson: 700,
    luxuryPerPerson: 1800,
    placeholder: '7500',
  },
];

export function getCurrencyConfig(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export interface BudgetEvaluation {
  hasBudget: boolean;
  budgetAmount?: number;
  currency: CurrencyConfig;
  minRecommended: number;
  perGuest?: number;
  tier: BudgetTier;
  portionWeightGr: number;
  totalWeightKg: number;
  badgeLabel: string;
  badgeStatus: 'warning' | 'info' | 'success' | 'gold';
  message: string;
  promptDirective: string;
  pastryAdvice: string;
}

export function evaluateBudget(
  rawBudget: string | number | undefined,
  rawGuests: string | number | undefined,
  currencyCode = 'TRY',
): BudgetEvaluation {
  const currency = getCurrencyConfig(currencyCode);
  const budgetNum = typeof rawBudget === 'string' ? parseFloat(rawBudget.replace(/[^0-9.]/g, '')) : rawBudget;
  const guestsNum = typeof rawGuests === 'string' ? parseInt(rawGuests.replace(/[^0-9]/g, ''), 10) : rawGuests;

  const validGuests = Number.isFinite(guestsNum) && (guestsNum as number) > 0 ? (guestsNum as number) : 10;
  const minRecommended = Math.max(currency.minBasePrice, validGuests * currency.minPerPerson);

  if (!budgetNum || isNaN(budgetNum) || budgetNum <= 0) {
    return {
      hasBudget: false,
      currency,
      minRecommended,
      tier: 'standard',
      portionWeightGr: 130,
      totalWeightKg: Math.round((validGuests * 130) / 100) / 10,
      badgeLabel: 'Standart Butik',
      badgeStatus: 'info',
      message: tx("{validGuests} kişilik özel pasta için tavsiye edilen piyasa tabanı: {p1} {symbol}", { validGuests, p1: minRecommended.toLocaleString(), symbol: currency.symbol }),
      promptDirective: 'Balanced boutique pastry standard, realistic dimensions and elegant gourmet presentation.',
      pastryAdvice: tx("Standart butik pastacılık porsiyonu (~130g/kişi) ve taze kaliteli malzemeler."),
    };
  }

  const perGuest = Math.round(budgetNum / validGuests);
  const luxuryThreshold = validGuests * currency.luxuryPerPerson;

  let tier: BudgetTier = 'standard';
  let portionWeightGr = 130;
  let badgeLabel = tx("İdeal Butik Standart");
  let badgeStatus: 'warning' | 'info' | 'success' | 'gold' = 'success';
  let message = '';
  let promptDirective = '';
  let pastryAdvice = '';

  if (budgetNum < minRecommended) {
    tier = 'under_minimum';
    portionWeightGr = 90;
    badgeLabel = tx("Tabanın Altında (Kompakt)");
    badgeStatus = 'warning';
    message = tx("Belirtilen bütçe ({p0} {symbol}), {validGuests} kişilik butik pasta asgari piyasa tabanının ({p3} {p4}) altındadır. Yapay zeka tasarımı kompakt porsiyon (~90g/kişi) ve akıllı maliyetli süslemelerle optimize edecektir.", { p0: budgetNum.toLocaleString(), symbol: currency.symbol, validGuests, p3: minRecommended.toLocaleString(), p4: currency.symbol });
    promptDirective = `Budget constraint notice: Economic compact size optimization (~90g per serving). Focus on minimalist, refined styling, clean buttercream brushstrokes rather than heavy expensive sugar sculptures. Realistic compact boutique scale.`;
    pastryAdvice = tx("Bütçe piyasa tabanının altında olduğu için porsiyon gramajı kompakt (~90g/kişi) tutulmalı; pahalı ithal malzemeler yerine yerli taze meyveler, çok katlı talep varsa üst kat maket (strafor dummy) olarak tasarlanmalıdır.");
  } else if (budgetNum >= luxuryThreshold) {
    tier = 'luxury';
    portionWeightGr = 175;
    badgeLabel = tx("Haute Pâtisserie (Ultra Lüks)");
    badgeStatus = 'gold';
    message = tx("Cömert bütçe ({p0} {symbol} · {p2} {p3}/kişi). Yapay zeka en üst seviye lüks detaylar, saf Belçika kuvertürü ve zengin porsiyon (~175g/kişi) uygulayacaktır.", { p0: budgetNum.toLocaleString(), symbol: currency.symbol, p2: perGuest.toLocaleString(), p3: currency.symbol });
    promptDirective = `Ultra-luxury haute pâtisserie budget tier. Opulent presentation, generous gourmet scale (~175g per serving), authentic 24k edible gold leaf accents, intricate handcrafted sugar florals, high-end satin ganache finish, grand masterclass craftsmanship.`;
    pastryAdvice = tx("Lüks bütçe seviyesi: Saf Belçika kuvertürü, Bourbon vanilyası, taze orman meyveleri, el yapımı şeker çiçekler ve yenilebilir 24K altın varaklar ile sınırsız sanat eseri sunumu.");
  } else if (budgetNum >= minRecommended * 1.35) {
    tier = 'standard';
    portionWeightGr = 135;
    badgeLabel = tx("İdeal Butik Standart");
    badgeStatus = 'success';
    message = tx("Dengeli ve ideal bütçe ({p0} {symbol} · {p2} {p3}/kişi). Kusursuz lezzet ve standart porsiyon (~135g/kişi).", { p0: budgetNum.toLocaleString(), symbol: currency.symbol, p2: perGuest.toLocaleString(), p3: currency.symbol });
    promptDirective = `Refined boutique standard tier. High quality artisanal pastry look, well-balanced portioning (~135g per serving), silky Swiss meringue buttercream, elegant modern textures.`;
    pastryAdvice = tx("İdeal butik seviyesi: İsviçre mereng kreması, doğal meyve dolguları ve dengeli el işçiliği süslemeler.");
  } else {
    tier = 'economic';
    portionWeightGr = 110;
    badgeLabel = tx("Ekonomik & Akıllı Denge");
    badgeStatus = 'info';
    message = tx("Akıllı bütçe seviyesi ({p0} {symbol} · {p2} {p3}/kişi). Kompakt porsiyon (~110g/kişi) ve gösterişli uygun maliyetli dokular.", { p0: budgetNum.toLocaleString(), symbol: currency.symbol, p2: perGuest.toLocaleString(), p3: currency.symbol });
    promptDirective = `Smart economic boutique tier. Elegant modern styling, compact portioning (~110g per serving), stylish wafer paper and buttercream accents, avoiding excessive heavy fondant.`;
    pastryAdvice = tx("Ekonomik butik seviyesi: Kompakt porsiyonlama (~110g/kişi), wafer paper dokunuşları ve hafifletilmiş hafif kremalar ile maliyet koruması.");
  }

  const totalWeightKg = Math.round((validGuests * portionWeightGr) / 100) / 10;

  return {
    hasBudget: true,
    budgetAmount: budgetNum,
    currency,
    minRecommended,
    perGuest,
    tier,
    portionWeightGr,
    totalWeightKg,
    badgeLabel,
    badgeStatus,
    message,
    promptDirective,
    pastryAdvice,
  };
}
