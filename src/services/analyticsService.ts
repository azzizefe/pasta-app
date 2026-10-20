import AsyncStorage from '@react-native-async-storage/async-storage';
import { addBreadcrumb, captureMessage } from './monitoringService';

const STORAGE_KEYS = {
  INSTALL_TIMESTAMP: '@lumiere_install_timestamp',
  LAST_ACTIVE_DATE: '@lumiere_last_active_date',
  SESSION_COUNT: '@lumiere_session_count',
  D1_REPORTED: '@lumiere_d1_retention_reported',
  D7_REPORTED: '@lumiere_d7_retention_reported',
};

/**
 * Uygulama açılışını ve D1 / D7 Retention (Kullanıcı Geri Dönüş) kohortlarını takip eder.
 */
export async function trackAppLaunchAndRetention(): Promise<void> {
  try {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Kurulum Tarihi Kontrolü
    let installTimestampStr = await AsyncStorage.getItem(STORAGE_KEYS.INSTALL_TIMESTAMP);
    let installTimestamp = installTimestampStr ? parseInt(installTimestampStr, 10) : null;

    if (!installTimestamp) {
      installTimestamp = now;
      await AsyncStorage.setItem(STORAGE_KEYS.INSTALL_TIMESTAMP, now.toString());
      addBreadcrumb('analytics', 'App first install recorded');
    }

    // 2. Oturum Sayısı Artışı
    const sessionCountStr = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
    const sessionCount = (sessionCountStr ? parseInt(sessionCountStr, 10) : 0) + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.SESSION_COUNT, sessionCount.toString());
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, todayStr);

    // 3. Gün Farkı Hesabı (Retention)
    const msDiff = now - installTimestamp;
    const daysSinceInstall = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // D1 Retention (1. Gün Tekrar Açılış)
    if (daysSinceInstall >= 1 && daysSinceInstall < 2) {
      const d1Reported = await AsyncStorage.getItem(STORAGE_KEYS.D1_REPORTED);
      if (!d1Reported) {
        await AsyncStorage.setItem(STORAGE_KEYS.D1_REPORTED, 'true');
        addBreadcrumb('retention', 'D1 Retention achieved (User returned on Day 1)');
        captureMessage('[Retention] D1 Retention: Kullanıcı 1. gün uygulamaya geri döndü.', 'info');
      }
    }

    // D7 Retention (7. Gün Tekrar Açılış)
    if (daysSinceInstall >= 7 && daysSinceInstall < 8) {
      const d7Reported = await AsyncStorage.getItem(STORAGE_KEYS.D7_REPORTED);
      if (!d7Reported) {
        await AsyncStorage.setItem(STORAGE_KEYS.D7_REPORTED, 'true');
        addBreadcrumb('retention', 'D7 Retention achieved (User returned on Day 7)');
        captureMessage('[Retention] D7 Retention: Kullanıcı 7. gün uygulamaya geri döndü.', 'info');
      }
    }

    addBreadcrumb('session', `App launched (Session #${sessionCount}, Day ${daysSinceInstall})`);
  } catch (err) {
    console.warn('[AnalyticsService] trackAppLaunchAndRetention hatası:', err);
  }
}

/**
 * Kullanıcı Kredi Satın Alma (Paywall) ekranını görüntülediğinde tetiklenir.
 * Funnel analizi için görüntüleme sayısını izler.
 */
export function trackPaywallImpression(triggerSource: string, currentCredits: number): void {
  try {
    addBreadcrumb('paywall', `Paywall viewed via source: ${triggerSource}`, {
      triggerSource,
      currentCredits,
    });
  } catch (err) {
    console.warn('[AnalyticsService] trackPaywallImpression hatası:', err);
  }
}

/**
 * Bir IAP paketi başarıyla satın alındığında tetiklenir.
 * Dönüşüm oranı (Paywall Conversion Rate) ve ARPU takibi için Sentry'ye bildirir.
 */
export function trackPurchaseSuccess(
  productId: string,
  creditsAdded: number,
  priceLabel?: string,
  paymentMethod: 'apple_iap' | 'google_play' | 'in_app' = 'apple_iap'
): void {
  try {
    addBreadcrumb('monetization', `Purchase completed: ${productId}`, {
      productId,
      creditsAdded,
      priceLabel,
      paymentMethod,
    });

    captureMessage(
      `[IAP Dönüşüm] Satın alma başarılı: Paket=${productId} (${creditsAdded} Kredi, ${priceLabel || 'N/A'}, Yöntem=${paymentMethod})`,
      'info'
    );
  } catch (err) {
    console.warn('[AnalyticsService] trackPurchaseSuccess hatası:', err);
  }
}

/**
 * Kullanıcı kredi harcadığında (görsel üretimi) tüketim hızını izlemek için tetiklenir.
 */
export function trackCreditConsumption(
  amount: number,
  reason: string,
  remainingCredits: number
): void {
  try {
    addBreadcrumb('credits', `Credit consumed: -${amount} for ${reason}`, {
      amount,
      reason,
      remainingCredits,
    });
  } catch (err) {
    console.warn('[AnalyticsService] trackCreditConsumption hatası:', err);
  }
}
