import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Permission to send the user's cake description and optional inspiration photo to
 * third-party AI providers (Google Gemini, OpenAI as backup). Apple guideline 5.1.2(i)
 * requires this to be disclosed and explicitly accepted before any data is sent.
 *
 * Bump CONSENT_VERSION when the providers or the shared data change, so users are asked again.
 * The key starts with "@lumiere" so account deletion (wipeLocalAccountData) clears it.
 */
const STORAGE_KEY = '@lumiere_ai_consent';
export const CONSENT_VERSION = 1;

type StoredConsent = { version: number; grantedAt: string };

export async function hasAiConsent(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    return parsed?.version === CONSENT_VERSION && typeof parsed.grantedAt === 'string';
  } catch {
    return false;
  }
}

export async function grantAiConsent(): Promise<void> {
  const record: StoredConsent = { version: CONSENT_VERSION, grantedAt: new Date().toISOString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function revokeAiConsent(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Error code returned by the AI services when they are called without consent. */
export const AI_CONSENT_REQUIRED = 'AI_CONSENT_REQUIRED';
