import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllReminders } from './notificationService';
import { clearAllLocalCakeStorage } from './localCakeStorageService';

const APP_KEY_PREFIX = '@lumiere';

/**
 * Cihaz üzerindeki tüm yerel verileri (krediler, tasarımlar, diskteki fotoğraflar,
 * özel günler, dil ve hatırlatıcı bildirimleri) temizler.
 */
export async function wipeLocalAccountData() {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((key) => key.startsWith(APP_KEY_PREFIX));
  if (appKeys.length > 0) await AsyncStorage.multiRemove(appKeys);
  await cancelAllReminders();
  await clearAllLocalCakeStorage();
}

/**
 * Apple App Store Guideline 5.1.1(v) ve GDPR / KVKK Tam Hesap Silme Fonksiyonu:
 * 1. Eğer Supabase yapılandırılmışsa, `delete_user_account` RPC fonksiyonunu çağırarak
 *    kullanıcının buluttaki tüm cüzdanını, satın alımlarını, pastalarını, siparişlerini
 *    ve storage görsellerini kalıcı olarak siler.
 * 2. Cihazdaki tüm yerel önbellek ve verileri sıfırlar.
 */
export async function deleteFullUserAccount(userAccessToken?: string | null) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && userAccessToken) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/delete_user_account`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${userAccessToken}`,
        },
      });

      if (res.ok) {
        console.log('[Account] Supabase hesabı ve ilişkili tüm veriler başarıyla silindi.');
      } else {
        console.warn(`[Account] Supabase hesap silme yanıtı: ${res.status}`);
      }
    } catch (err) {
      console.warn('[Account] Supabase uzaktan hesap silme hatası:', err);
    }
  }

  // Cihazdaki yerel verileri temizle
  await wipeLocalAccountData();
}
