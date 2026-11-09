import { Platform } from 'react-native';
import { ENV, isRevenueCatConfigured } from '../config/env';
import {
  IAP_PACKAGES,
  IAPPackage,
  PurchaseResult,
  RestoreResult,
} from '../types/iap';
import { tx } from '../i18n/tx';
import { messageForStoreError } from './errorMessages';

/**
 * React Native Purchases (RevenueCat SDK).
 * Loaded with require so the web bundle and Expo Go never crash on it.
 */
let PurchasesSDK: any = null;
let NON_SUBSCRIPTION: string = 'NON_SUBSCRIPTION';

try {
  const RNPurchases = require('react-native-purchases');
  const sdk = RNPurchases.default || RNPurchases;
  if (sdk && typeof sdk.configure === 'function') {
    PurchasesSDK = sdk;
    NON_SUBSCRIPTION = RNPurchases.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? NON_SUBSCRIPTION;
  }
} catch {
  PurchasesSDK = null;
}

/** True only after RevenueCat was configured with a real key. Until then purchases use the sandbox. */
let isStoreReady = false;
let isInitialized = false;
/** Signed-in user. RevenueCat sends it to our webhook as app_user_id, so the server knows whom to credit. */
let currentUserId: string | null = null;

function storeApiKey(): string {
  const key = Platform.OS === 'ios' ? ENV.REVENUECAT_APPLE_KEY : ENV.REVENUECAT_GOOGLE_KEY;
  return key && !key.includes('sample') ? key : '';
}

/** Starts RevenueCat once. Without the SDK or a key (Expo Go, web, no account yet) the sandbox is used. */
export async function initIAP(): Promise<boolean> {
  if (isInitialized) return isStoreReady;
  isInitialized = true;

  const apiKey = storeApiKey();
  if (Platform.OS === 'web' || !PurchasesSDK || !apiKey || !isRevenueCatConfigured()) {
    return false;
  }

  try {
    PurchasesSDK.configure(currentUserId ? { apiKey, appUserID: currentUserId } : { apiKey });
    isStoreReady = true;
    console.log(`[RevenueCat] ${Platform.OS} için mağaza bağlantısı hazır.`);
  } catch (err) {
    console.warn('[RevenueCat] Başlatılamadı, sandbox kullanılacak:', err);
  }
  return isStoreReady;
}

/**
 * Links store purchases to the signed-in user (null on sign-out).
 * Call before any purchase so RevenueCat reports the right app_user_id to the server.
 */
export async function setIAPUser(userId: string | null): Promise<void> {
  if (userId === currentUserId) return;
  currentUserId = userId;
  if (!isStoreReady) return;
  try {
    if (userId) await PurchasesSDK.logIn(userId);
    else await PurchasesSDK.logOut();
  } catch (err) {
    // logOut throws for anonymous users; nothing to undo then.
    console.warn('[RevenueCat] Kullanıcı eşlenemedi:', err);
  }
}

/** True when purchases go to the real App Store / Google Play. */
export function isNativeIAP(): boolean {
  return isStoreReady;
}

/** Store products for the given ids. Credit packs are consumables, not subscriptions. */
async function getStoreProducts(ids: string[]): Promise<any[]> {
  const products = await PurchasesSDK.getProducts(ids, NON_SUBSCRIPTION);
  return Array.isArray(products) ? products : [];
}

function withStorePrice(pkg: IAPPackage, product: any): IAPPackage {
  return {
    ...pkg,
    priceTRY: product.priceString || pkg.priceTRY,
    priceUSD: product.priceString || pkg.priceUSD,
    priceValue: typeof product.price === 'number' ? product.price : pkg.priceValue,
    currencyCode: product.currencyCode || pkg.currencyCode,
  };
}

/** The credit packs, with the store's localized prices when the store is connected. */
export async function getIAPPackages(): Promise<IAPPackage[]> {
  if (await initIAP()) {
    try {
      const products = await getStoreProducts(IAP_PACKAGES.map((p) => p.id));
      return IAP_PACKAGES.map((pkg) => {
        const product = products.find((p) => p?.identifier === pkg.id);
        return product ? withStorePrice(pkg, product) : pkg;
      });
    } catch (err) {
      console.warn('[RevenueCat] Ürünler alınamadı, varsayılan paketler kullanılıyor:', err);
    }
  }
  return IAP_PACKAGES;
}

/**
 * Tek seferlik indirimli teklifin mağaza ürününü getirir.
 * Fiyat her zaman App Store / Google Play'den gelir; ürün mağazada yoksa null döner ve teklif gösterilmez.
 * Böylece ekranda yazan fiyat ile kullanıcıdan çekilen fiyat hiçbir zaman farklı olmaz.
 */
export async function getOfferPackage(fallback: IAPPackage): Promise<IAPPackage | null> {
  if (await initIAP()) {
    try {
      const product = (await getStoreProducts([fallback.id])).find((p) => p?.identifier === fallback.id);
      return product?.priceString ? withStorePrice(fallback, product) : null;
    } catch (err) {
      console.warn('[RevenueCat] Teklif ürünü alınamadı, teklif gizleniyor:', err);
      return null;
    }
  }

  // Mağaza bağlantısı olmayan ortam: yalnızca geliştirme sırasında örnek fiyatla göster.
  return __DEV__ ? fallback : null;
}

/**
 * Bir kredi paketini satın alma akışını başlatır.
 * - iOS: Apple StoreKit ödeme sayfası açılır.
 * - Android: Google Play Billing satın alma diyaloğu açılır.
 * - Expo Go / Web / geliştirme: sandbox simülasyonu çalışır.
 */
export async function purchaseIAPPackage(pkg: IAPPackage): Promise<PurchaseResult> {
  if (await initIAP()) {
    try {
      const product = (await getStoreProducts([pkg.id])).find((p) => p?.identifier === pkg.id);
      if (!product) {
        return { success: false, error: tx("Bu paket şu anda mağazada bulunamadı.") };
      }
      const { transaction } = await PurchasesSDK.purchaseStoreProduct(product);
      return {
        success: true,
        packageId: pkg.id,
        creditsAdded: pkg.credits,
        transactionId: transaction?.transactionIdentifier,
      };
    } catch (error: any) {
      if (error?.userCancelled) {
        return {
          success: false,
          userCancelled: true,
          error: tx("Satın alma kullanıcı tarafından iptal edildi."),
        };
      }
      return {
        success: false,
        error: messageForStoreError(error, tx("Apple/Google mağaza ödemesi tamamlanamadı.")),
      };
    }
  }

  // A production build without a real store (e.g. the web app) must never hand out free credits.
  if (!__DEV__) {
    return {
      success: false,
      error: tx("Ödeme sistemi bu platformda henüz aktif değil."),
    };
  }

  // Sandbox: Expo Go ve yerel testlerde akışı doğrulamak için kısa gecikmeyle başarılı ödeme.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return {
    success: true,
    packageId: pkg.id,
    creditsAdded: pkg.credits,
    transactionId: `sandbox_${Platform.OS}_${Date.now()}`,
  };
}

/**
 * Apple & Google gereksinimi: Geçmiş satın alımları geri yükler.
 * (Apple App Review kılavuzunda "Restore Purchases" butonu zorunludur).
 */
export async function restoreIAPPurchases(): Promise<RestoreResult> {
  if (await initIAP()) {
    try {
      const customerInfo = await PurchasesSDK.restorePurchases();
      const nonSubscriptionTransactions = customerInfo?.nonSubscriptionTransactions || [];
      return {
        success: true,
        restoredCount: nonSubscriptionTransactions.length,
      };
    } catch (err: any) {
      return {
        success: false,
        restoredCount: 0,
        error: messageForStoreError(err, tx("Geri yükleme işlemi başarısız oldu.")),
      };
    }
  }

  // Sandbox simülasyonu
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    success: true,
    restoredCount: 0,
  };
}
