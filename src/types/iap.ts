/**
 * In-App Purchases (IAP) & RevenueCat Tipleri
 * Apple StoreKit ve Google Play Billing ile tam uyumlu veri modelleri.
 */

export type IAPPackageId =
  | 'lumiere_credits_single_15'
  | 'lumiere_credits_starter_200'
  | 'lumiere_credits_popular_1000';

export interface IAPPackage {
  id: IAPPackageId;
  credits: number;
  bonus?: number;
  cakes: number;
  priceTRY: string;
  priceUSD: string;
  priceEUR: string;
  priceSAR: string;
  title: string;
  badge?: string;
  popular?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  packageId?: string;
  creditsAdded?: number;
  transactionId?: string;
  error?: string;
  userCancelled?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredCount: number;
  error?: string;
}

/**
 * Lumière Sucrée Tüketilebilir (Consumable) Kredi Paketleri
 * App Store Connect ve Google Play Console'da birebir bu ID'lerle açılır.
 */
export const IAP_PACKAGES: IAPPackage[] = [
  {
    id: 'lumiere_credits_single_15',
    credits: 15,
    cakes: 1,
    priceTRY: '₺87,99',
    priceUSD: '$2.49',
    priceEUR: '€2.49',
    priceSAR: '9.99 SAR',
    title: 'Tek Pasta Paketi',
  },
  {
    id: 'lumiere_credits_starter_200',
    credits: 200,
    cakes: 13,
    priceTRY: '₺874,99',
    priceUSD: '$24.99',
    priceEUR: '€24.99',
    priceSAR: '99.99 SAR',
    title: 'Başlangıç Paketi',
  },
  {
    id: 'lumiere_credits_popular_1000',
    credits: 1000,
    cakes: 66,
    priceTRY: '₺3.499,99',
    priceUSD: '$99.99',
    priceEUR: '€99.99',
    priceSAR: '399.99 SAR',
    title: 'Gourmet Paketi',
    badge: 'EN ÇOK TERCİH EDİLEN',
    popular: true,
  },
];
