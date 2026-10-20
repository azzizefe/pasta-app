import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';
import { addBreadcrumb, captureMessage } from './monitoringService';

const STORAGE_KEYS = {
  ACTIONS_COUNT: '@lumiere_review_actions_count',
  HAS_PROMPTED: '@lumiere_review_has_prompted',
  FEEDBACK_ITEMS: '@lumiere_review_feedback_items',
  LAST_PROMPT_DATE: '@lumiere_review_last_prompt_date',
};

// "Aha! Moment" için gereken minimum işlem sayısı (2. pasta indirme veya favorileme)
const AHA_MOMENT_THRESHOLD = 2;

export interface InternalFeedbackEntry {
  id: string;
  feedback: string;
  timestamp: number;
  cakeTitle?: string;
}

/**
 * Kullanıcının şu ana kadar gerçekleştirdiği pozitif aksiyon sayısını döner.
 */
export async function getPositiveActionCount(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.ACTIONS_COUNT);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Kullanıcıya daha önce değerlendirme modalı gösterilip gösterilmediğini döner.
 */
export async function hasReviewBeenPrompted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.HAS_PROMPTED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Pozitif bir kullanıcı eylemini (Pasta İndirme veya Favoriye Ekleme) kaydeder.
 * Eğer eşik değer (2. işlem) aşılmışsa ve daha önce sorulmamışsa `true` döner.
 */
export async function registerPositiveAction(): Promise<boolean> {
  try {
    const alreadyPrompted = await hasReviewBeenPrompted();
    if (alreadyPrompted) {
      return false;
    }

    const currentCount = await getPositiveActionCount();
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIONS_COUNT, newCount.toString());

    addBreadcrumb(
      'review_strategy',
      `User completed positive action #${newCount}`
    );

    // "Aha! Moment" eşiği karşılandı mı?
    if (newCount >= AHA_MOMENT_THRESHOLD) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[ReviewService] registerPositiveAction hatası:', error);
    return false;
  }
}

/**
 * Değerlendirme modalının gösterildiğini işaretler (Kullanıcı tekrar rahatsız edilmez).
 */
export async function markReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_PROMPTED, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_DATE, Date.now().toString());
  } catch (error) {
    console.warn('[ReviewService] markReviewPrompted hatası:', error);
  }
}

/**
 * Yerel Apple StoreKit / Google Play Store değerlendirme penceresini tetikler.
 * Web ortamında veya desteklenmeyen cihazlarda güvenle sessizce başarısız olur.
 */
export async function triggerNativeStoreReview(): Promise<boolean> {
  try {
    addBreadcrumb(
      'review_strategy',
      'Triggering native store review (5-star candidate)'
    );

    await markReviewPrompted();

    if (Platform.OS === 'web') {
      console.log('[ReviewService] Web ortamında StoreReview desteklenmez.');
      return false;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
      captureMessage('Apple StoreKit review prompt presented to user', 'info');
      return true;
    } else {
      console.log('[ReviewService] StoreReview bu ortamda kullanılamıyor (örn. Simulator/TestFlight).');
      return false;
    }
  } catch (error) {
    console.warn('[ReviewService] triggerNativeStoreReview hatası:', error);
    return false;
  }
}

/**
 * Düşük puan potansiyeli olan kullanıcıların geri bildirimlerini App Store yerine
 * şirket içine (Sentry & AsyncStorage) aktarır. Böylece mağaza puanı korunur.
 */
export async function submitInternalFeedback(
  feedback: string,
  cakeTitle?: string
): Promise<void> {
  try {
    await markReviewPrompted();

    const entry: InternalFeedbackEntry = {
      id: `fb_${Date.now()}`,
      feedback: feedback.trim(),
      timestamp: Date.now(),
      cakeTitle,
    };

    // Yerel hafızaya kaydet
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.FEEDBACK_ITEMS);
    const list: InternalFeedbackEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.unshift(entry);
    await AsyncStorage.setItem(STORAGE_KEYS.FEEDBACK_ITEMS, JSON.stringify(list.slice(0, 50)));

    // Monitoring servisine ve konsola bildir
    captureMessage(`[Müşteri Geri Bildirimi]: "${entry.feedback}" (Pasta: ${cakeTitle || 'Belirtilmedi'})`, 'info');

    addBreadcrumb(
      'feedback',
      `Internal feedback received: ${entry.feedback.slice(0, 40)}...`
    );
  } catch (error) {
    console.warn('[ReviewService] submitInternalFeedback hatası:', error);
  }
}

/**
 * Geliştirme / test amaçlı inceleme sayacını sıfırlar.
 */
export async function resetReviewState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIONS_COUNT);
    await AsyncStorage.removeItem(STORAGE_KEYS.HAS_PROMPTED);
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_PROMPT_DATE);
  } catch (error) {
    console.warn('[ReviewService] resetReviewState hatası:', error);
  }
}
