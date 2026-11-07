import { CREDITS_PER_GENERATION, CREDITS_PER_GENERATION_4K } from '../context/CreditsContext';
import type { IAPPackage } from '../types/iap';
import { getTxLocale } from '../i18n/tx';

export type PackageValue = {
  /** Whole-percent saving versus buying the same credits at the most expensive per-credit rate (floored, never overstated). */
  savingsPct: number;
  /** What these credits would cost at that most expensive rate. */
  referencePrice: number;
  /** Price of one standard design inside this package. */
  perDesign: number;
  /** Price of one standard design at the most expensive rate. */
  basePerDesign: number;
  standardCount: number;
  fourKCount: number;
};

/** The package with the highest per-credit price is the yardstick savings are measured against. */
function getBasePerCredit(packages: IAPPackage[], currencyCode: string) {
  return packages
    .filter((p) => p.currencyCode === currencyCode && p.credits > 0)
    .reduce((max, p) => Math.max(max, p.priceValue / p.credits), 0);
}

export function getPackageValue(pkg: IAPPackage, packages: IAPPackage[]): PackageValue {
  const basePerCredit = getBasePerCredit(packages, pkg.currencyCode);
  const perCredit = pkg.priceValue / pkg.credits;
  const referencePrice = basePerCredit * pkg.credits;
  const savingsPct =
    referencePrice > 0 ? Math.max(0, Math.floor((1 - pkg.priceValue / referencePrice) * 100)) : 0;

  return {
    savingsPct,
    referencePrice,
    perDesign: perCredit * CREDITS_PER_GENERATION,
    basePerDesign: basePerCredit * CREDITS_PER_GENERATION,
    standardCount: Math.floor(pkg.credits / CREDITS_PER_GENERATION),
    fourKCount: Math.floor(pkg.credits / CREDITS_PER_GENERATION_4K),
  };
}

export function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(getTxLocale(), {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}
