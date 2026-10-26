import { Platform } from 'react-native';
import { ENV, isRevenueCatConfigured } from '../config/env';
import {
  IAP_PACKAGES,
  IAPPackage,
  PurchaseResult,
  RestoreResult,
} from '../types/iap';

/**
 * React Native Purchases (RevenueCat SDK)
 * Expo Go veya Web ortamında çökmemesi için güvenli dinamik import yapılır.
 */
let PurchasesSDK: any = null;
let isNativeModuleAvailable = false;

try {
  // Yalnızca yerel kod içeren derlemelerde (EAS Build / dev-client) çalışır
  const RNPurchases = require('react-native-purchases');
  PurchasesSDK = RNPurchases.default || RNPurchases;
  isNativeModuleAvailable = Boolean(PurchasesSDK && typeof PurchasesSDK.configure === 'function');
} catch {
  // Expo Go veya Web ortamında native modül yoktur, Sandbox moduna geçilir
  PurchasesSDK = null;
  isNativeModuleAvailable = false;
}

let isInitialized = false;

/**
 * RevenueCat SDK'sını başlatır.
 *
 * @param appUserId Opsiyonel kullanıcı kimliği (örneğin Supabase / Firebase UID)
 */
export async function initIAP(appUserId?: string): Promise<boolean> {
  if (isInitialized) return true;

  if (Platform.OS === 'web') {
    // Web tarayıcısında sandbox/simülasyon modu kullanılır
    isInitialized = true;
    return true;
  }

  const apiKey =
    Platform.OS === 'ios' ? ENV.REVENUECAT_APPLE_KEY : ENV.REVENUECAT_GOOGLE_KEY;

  if (isNativeModuleAvailable && PurchasesSDK && apiKey && !apiKey.includes('sample')) {
    try {
      if (appUserId) {
        await PurchasesSDK.configure({ apiKey, appUserID: appUserId });
      } else {
        await PurchasesSDK.configure({ apiKey });
      }
      isInitialized = true;
      console.log(`[RevenueCat] ${Platform.OS} için StoreKit/Play Billing başarıyla başlatıldı.`);
      return true;
    } catch (err) {
      console.warn('[RevenueCat] Başlatma hatası, Sandbox moduna geçiliyor:', err);
    }
  }

  // Native modül yoksa veya test anahtarı girildiyse Sandbox modunda çalışır
  isInitialized = true;
  return true;
}

/**
 * Cihazın yerel Apple StoreKit / Google Play altyapısına sahip olup olmadığını döndürür.
 */
export function isNativeIAP(): boolean {
  return isNativeModuleAvailable && isRevenueCatConfigured();
}

/**
 * Mevcut paketleri ve mağazadaki yerel fiyatları getirir.
 */
export async function getIAPPackages(): Promise<IAPPackage[]> {
  if (isNativeModuleAvailable && PurchasesSDK) {
    try {
      const offerings = await PurchasesSDK.getOfferings();
      if (offerings?.current?.availablePackages?.length > 0) {
        // Mağazadan gelen gerçek fiyatları yerel paketlerle eşleştir
        const serverPackages = offerings.current.availablePackages;
        return IAP_PACKAGES.map((pkg) => {
          const match = serverPackages.find(
            (sp: any) =>
              sp.product?.identifier === pkg.id ||
              sp.identifier === pkg.id,
          );
          if (match?.product) {
            return {
              ...pkg,
              priceTRY: match.product.priceString || pkg.priceTRY,
              priceUSD: match.product.priceString || pkg.priceUSD,
              priceValue:
                typeof match.product.price === 'number' ? match.product.price : pkg.priceValue,
              currencyCode: match.product.currencyCode || pkg.currencyCode,
            };
          }
          return pkg;
        });
      }
    } catch (err) {
      console.warn('[RevenueCat] Offerings alınamadı, varsayılan paketler kullanılıyor:', err);
    }
  }

  // Sandbox / Çevrimdışı / Expo Go varsayılan paketleri
  return IAP_PACKAGES;
}

/**
 * Bir kredi paketini satın alma akışını başlatır.
 * - iOS: Apple StoreKit 2 FaceID / TouchID sheet açılır.
 * - Android: Google Play Billing satın alma diyaloğu açılır.
 * - Expo Go / Web / Test: Güvenli Sandbox simülasyonu çalışır.
 */
export async function purchaseIAPPackage(pkg: IAPPackage): Promise<PurchaseResult> {
  await initIAP();

  if (isNativeModuleAvailable && PurchasesSDK) {
    try {
      // Gerçek RevenueCat / StoreKit satın alma işlemi
      const { customerInfo } = await PurchasesSDK.purchaseProduct(pkg.id);

      return {
        success: true,
        packageId: pkg.id,
        creditsAdded: pkg.credits,
        transactionId: `rc_${Date.now()}`,
      };
    } catch (error: any) {
      if (error?.userCancelled) {
        return {
          success: false,
          userCancelled: true,
          error: 'Satın alma kullanıcı tarafından iptal edildi.',
        };
      }
      return {
        success: false,
        error: error?.message || 'Apple/Google mağaza ödemesi tamamlanamadı.',
      };
    }
  }

  // A production build without a real store (e.g. the web app) must never hand out free credits.
  if (!__DEV__) {
    return {
      success: false,
      error: 'Ödeme sistemi bu platformda henüz aktif değil.',
    };
  }

  // ========================================================
  // SANDBOX SIMULATION (Expo Go & Geliştirme Ortamı)
  // ========================================================
  // Gerçek cihazda Expo Go çalışırken veya yerel testlerde akışı doğrulamak için
  // 1 saniyelik doğal gecikmeyle başarılı ödeme simülasyonu gerçekleştirir.
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
  await initIAP();

  if (isNativeModuleAvailable && PurchasesSDK) {
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
        error: err?.message || 'Geri yükleme işlemi başarısız oldu.',
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
