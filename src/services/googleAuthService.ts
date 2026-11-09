import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { type AppleUser } from './appleAuthService';
import { tx } from '../i18n/tx';

// Web ortamında auth session'ı tamamlamak için
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  success: boolean;
  user?: AppleUser;
  error?: string;
}

/**
 * URL fragment (#access_token=...&refresh_token=...) veya query (?access_token=...) parametrelerini ayrıştırır.
 */
function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  const queryString =
    hashIndex !== -1
      ? url.substring(hashIndex + 1)
      : queryIndex !== -1
      ? url.substring(queryIndex + 1)
      : '';

  if (!queryString) return params;

  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return params;
}

/**
 * Supabase Google OAuth akışını başlatır.
 * - Tarayıcıda güvenli Google giriş ekranını açar.
 * - Kullanıcı onayladığında token'ları alır ve Supabase profilini getirir.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      error: tx("Supabase bağlantı bilgileri (.env) bulunamadı."),
    };
  }

  try {
    // Yönlendirme adresi: Mobilde deep link scheme, Web'de pencere adresi
    const redirectUrl =
      Platform.OS === 'web'
        ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
        : 'lumieresucree://auth/callback';

    const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      redirectUrl,
    )}`;

    console.log('[GoogleAuth] OAuth başlatılıyor:', authUrl);

    // Expo WebBrowser ile güvenli OAuth oturumu aç
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return {
          success: false,
          error: tx("Giriş işlemi iptal edildi."),
        };
      }
      return {
        success: false,
        error: tx("Google yetkilendirme yanıtı alınamadı."),
      };
    }

    console.log('[GoogleAuth] Yönlendirme yanıtı alındı');
    const params = parseAuthParams(result.url);
    const accessToken = params['access_token'];

    if (!accessToken) {
      return {
        success: false,
        error: tx("Google ile giriş yapılırken beklenmedik bir hata oluştu."),
      };
    }

    // Supabase Auth API'den kullanıcı profilini doğrula
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(tx("Kullanıcı bilgisi alınamadı ({status})", { status: userResponse.status }));
    }

    const userData = await userResponse.json();
    const meta = userData.user_metadata || {};

    const fullName =
      meta.full_name ||
      meta.name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(' ') ||
      tx("Google Kullanıcısı");

    const authUser: AppleUser = {
      id: userData.id,
      email: userData.email || null,
      name: fullName,
      identityToken: accessToken,
      authorizationCode: params['refresh_token'] || null,
    };

    return {
      success: true,
      user: authUser,
    };
  } catch (err: any) {
    console.error('[GoogleAuth] Hata:', err);
    return {
      success: false,
      error: tx("Google ile giriş yapılırken beklenmedik bir hata oluştu."),
    };
  }
}
