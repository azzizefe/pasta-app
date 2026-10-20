import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface AppleUser {
  id: string;
  email: string | null;
  name: string | null;
  identityToken: string | null;
  authorizationCode: string | null;
}

export interface AppleAuthResult {
  success: boolean;
  user?: AppleUser;
  error?: string;
}

/**
 * Cihazın Apple ile Giriş Yap (Sign in with Apple) destekleyip desteklemediğini kontrol eder.
 * (iOS 13+ ve fiziksel cihazlarda true döner; Web ve Android'de false döner)
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.warn('isAppleAuthAvailable kontrol hatası:', error);
    return false;
  }
}

/**
 * Sign in with Apple akışını tetikler.
 * - iOS: Resmi yerel FaceID / TouchID / Apple ID sheet açar.
 * - Web / Android: Test ve demo için güvenli Amélie profili simüle eder.
 */
export async function signInWithApple(): Promise<AppleAuthResult> {
  // Web veya Android ortamında güvenli demo fallback
  if (Platform.OS !== 'ios') {
    return {
      success: true,
      user: {
        id: 'apple_demo_user_' + Date.now(),
        email: 'amelie@lumieresucree.app',
        name: 'Amélie Poulain',
        identityToken: 'simulated_jwt_token',
        authorizationCode: 'simulated_auth_code',
      },
    };
  }

  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Bu cihazda Apple ile Giriş Yap kullanılamıyor.',
      };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Apple, kullanıcının adını ve e-postasını yalnızca İLK girişte gönderir.
    let fullName: string | null = null;
    if (credential.fullName) {
      const parts = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean);
      if (parts.length > 0) {
        fullName = parts.join(' ');
      }
    }

    return {
      success: true,
      user: {
        id: credential.user,
        email: credential.email,
        name: fullName || 'Apple Kullanıcısı',
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
      },
    };
  } catch (error: any) {
    // Kullanıcı iptal ettiyse (Code 1001)
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        success: false,
        error: 'Giriş işlemi iptal edildi.',
      };
    }

    console.error('Apple ile giriş hatası:', error);
    return {
      success: false,
      error: error?.message || 'Apple ile giriş yapılırken bir sorun oluştu.',
    };
  }
}
