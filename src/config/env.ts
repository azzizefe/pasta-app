/**
 * Ortam Değişkenleri (Environment Variables) Yapılandırması
 *
 * Expo SDK'da istemci tarafından erişilecek değişkenlerin başında
 * "EXPO_PUBLIC_" öneki bulunmalıdır.
 */

export const ENV = {
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  GEMINI_IMAGE_MODEL:
    process.env.EXPO_PUBLIC_GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  /** Gemini 3.1 Flash Lite tarif modeli (Kendi Pastanı Oluştur için) */
  GEMINI_RECIPE_MODEL:
    process.env.EXPO_PUBLIC_GEMINI_RECIPE_MODEL || 'gemini-3.1-flash-lite',
  /** Tarif üretimi için maksimum token sınırı (10.000 token'a kadar kapsamlı rehber) */
  GEMINI_RECIPE_MAX_TOKENS: parseInt(
    process.env.EXPO_PUBLIC_GEMINI_RECIPE_MAX_TOKENS || '10000',
    10
  ),
  DEFAULT_IMAGE_QUALITY:
    (process.env.EXPO_PUBLIC_AI_DEFAULT_QUALITY as 'standard' | '4k') || '4k',
  /** Güvenli Backend Proxy URL'i (Prodüksiyonda Gemini API anahtarını korumak için) */
  AI_BACKEND_URL: process.env.EXPO_PUBLIC_AI_BACKEND_URL || '',
  /** RevenueCat Apple App Store Public SDK Key (appl_...) */
  REVENUECAT_APPLE_KEY: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '',
  /** RevenueCat Google Play Public SDK Key (goog_...) */
  REVENUECAT_GOOGLE_KEY: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || '',
};

/** Güvenli AI Proxy backend sunucusunun yapılandırılıp yapılandırılmadığını kontrol eder */
export function hasAIBackend(): boolean {
  return Boolean(ENV.AI_BACKEND_URL && ENV.AI_BACKEND_URL.trim().length > 0);
}

/** Gemini üretim altyapısının (Güvenli Proxy veya Yerel API Anahtarı) hazır olup olmadığını kontrol eder */
export function isGeminiConfigured(): boolean {
  return hasAIBackend() || Boolean(ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.trim().length > 0);
}

/** RevenueCat IAP servisinin yapılandırılıp yapılandırılmadığını kontrol eder */
export function isRevenueCatConfigured(): boolean {
  return Boolean(
    (ENV.REVENUECAT_APPLE_KEY && ENV.REVENUECAT_APPLE_KEY.trim().length > 0) ||
      (ENV.REVENUECAT_GOOGLE_KEY && ENV.REVENUECAT_GOOGLE_KEY.trim().length > 0),
  );
}
