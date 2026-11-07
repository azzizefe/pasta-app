import { Linking, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tx } from '../i18n/tx';

const USER_CODE_STORAGE_KEY = '@lumiere_user_referral_code_v1';
const CLAIMED_CODE_STORAGE_KEY = '@lumiere_claimed_referral_code_v1';
const PENDING_REF_STORAGE_KEY = '@lumiere_pending_referral_ref_v1';
const STATS_STORAGE_KEY = '@lumiere_referral_stats_v1';

export const REFERRAL_BONUS_CREDITS = 5;
export const APP_DOWNLOAD_BASE_URL = 'https://lumieresucree.app/download';

export type ReferralStats = {
  invitedCount: number;
  earnedCredits: number;
  redeemedFriendCode: string | null;
};

/**
 * 6-8 haneli lüks ve akılda kalıcı referral kodu üretir (örn: LUMI-7842).
 */
function generateCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LUMI-${rand}`;
}

/**
 * Kullanıcıya ait özel referral kodunu döner. Yoksa üretip kaydeder.
 */
export async function getUserReferralCode(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(USER_CODE_STORAGE_KEY);
    if (existing && existing.trim().length >= 6) {
      return existing.trim().toUpperCase();
    }
    const newCode = generateCode();
    await AsyncStorage.setItem(USER_CODE_STORAGE_KEY, newCode);
    return newCode;
  } catch (err) {
    console.warn('Referral kodu yüklenemedi:', err);
    return 'LUMI-7749';
  }
}

/**
 * Arkadaşa gönderilecek indirme bağlantısını oluşturur.
 */
export function getAppDownloadLink(code: string): string {
  return `${APP_DOWNLOAD_BASE_URL}?ref=${encodeURIComponent(code)}`;
}

/**
 * Gelen URL içerisinden (deep link veya web query) davet kodunu ayıklar ve saklar.
 */
export async function recordPendingReferralFromUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    let code: string | null = null;
    const match = url.match(/[?&]ref=([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      code = match[1].trim().toUpperCase();
    }

    if (code && code.length >= 4) {
      await AsyncStorage.setItem(PENDING_REF_STORAGE_KEY, code);
      return code;
    }
  } catch (err) {
    console.warn('URL davet kodu okunamadı:', err);
  }
  return null;
}

/**
 * Kullanıcı kaydolduğunda (Sign in with Apple / Google), bekleyen davet bağlantısı
 * varsa kontrol eder ve +5 Hediye Kredi tanımlar.
 */
export async function checkAndClaimSignupReferralBonus(): Promise<{
  claimed: boolean;
  bonusCredits: number;
  refCode?: string;
}> {
  try {
    const alreadyClaimed = await AsyncStorage.getItem(CLAIMED_CODE_STORAGE_KEY);
    if (alreadyClaimed) {
      return { claimed: false, bonusCredits: 0 };
    }

    const pendingRef = await AsyncStorage.getItem(PENDING_REF_STORAGE_KEY);
    if (!pendingRef) {
      return { claimed: false, bonusCredits: 0 };
    }

    const ownCode = await getUserReferralCode();
    // Kendi linkiyle kaydolmayı engelle
    if (pendingRef.toUpperCase() === ownCode.toUpperCase()) {
      await AsyncStorage.removeItem(PENDING_REF_STORAGE_KEY);
      return { claimed: false, bonusCredits: 0 };
    }

    // Başarıyla ödülü kaydet
    await AsyncStorage.setItem(CLAIMED_CODE_STORAGE_KEY, pendingRef);
    await AsyncStorage.removeItem(PENDING_REF_STORAGE_KEY);

    return {
      claimed: true,
      bonusCredits: REFERRAL_BONUS_CREDITS,
      refCode: pendingRef,
    };
  } catch (err) {
    console.warn('Davet bonusu kontrol hatası:', err);
    return { claimed: false, bonusCredits: 0 };
  }
}

/**
/**
 * Arkadaş davet bağlantısını ve şık davet mesajını paylaşır.
 */
export async function shareReferralInvite(code: string): Promise<boolean> {
  const inviteLink = getAppDownloadLink(code);
  const message =
    tx("🎂 Lumière Sucrée ile hayalindeki butik pastayı yapay zekayla tasarla!\n\n") +
    tx("Sana özel davet bağlantımla aramıza katıl:\n") +
    `👉 ${inviteLink}\n\n` +
    tx("Kaydolduğunda anında 5 Hediye Kredi hesabına tanımlanacak ✨");

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: tx("Lumière Sucrée — Arkadaş Daveti"),
        text: message,
        url: inviteLink,
      });
      return true;
    }
    const result = await Share.share({
      title: tx("Lumière Sucrée Davet Bağlantısı"),
      message,
      url: Platform.OS === 'ios' ? inviteLink : undefined,
    });
    return result.action === Share.sharedAction;
  } catch (err) {
    console.warn('Paylaşım yapılamadı:', err);
    return false;
  }
}
