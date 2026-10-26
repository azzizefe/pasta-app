/**
 * Lumière Sucrée — İstemci ve Sunucu Güvenlik Yardımcıları (Security Utilities)
 *
 * Kapsam:
 * 1. XSS (Cross-Site Scripting) & HTML / Script Tag Sanitization
 * 2. Prompt Injection & AI Jailbreak Kalkanı
 * 3. Güvenli URI / Bağlantı Doğrulayıcı (javascript: ve data:text/html engeli)
 */

/** Maksimum izin verilen kullanıcı prompt uzunluğu (Jailbreak ve DDoS engelleme) */
export const MAX_USER_PROMPT_LENGTH = 500;
export const MAX_CAKE_TITLE_LENGTH = 100;
export const MAX_CUSTOM_NOTES_LENGTH = 1000;

/**
 * XSS & HTML Enjeksiyon Kalkanı:
 * HTML etiketlerini (<script>, <iframe> vb.) kaldırır ve tehlikeli karakterleri zararsız hale getirir.
 */
export function sanitizeInput(input: unknown, maxLength: number = MAX_USER_PROMPT_LENGTH): string {
  if (typeof input !== 'string') {
    return '';
  }

  // 1. Unicode normalizasyonu (Görünmez sıfır genişlikli karakterleri temizler)
  let clean = input.normalize('NFKC');

  // 2. HTML etiketlerini ve script bloklarını tamamen temizle
  clean = clean.replace(/<[^>]*>?/gm, '');

  // 3. Tehlikeli protokol çağrılarını temizle (javascript:, vbscript:, data:text/html)
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');

  // 4. HTML özel karakterlerini encode et
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // 5. Aşırı uzunluk sınırlaması (Buffer overflow / DoS koruması)
  return clean.trim().slice(0, maxLength);
}

/**
 * Prompt Enjeksiyonu (Jailbreak) Tespit Kalkanı:
 * Kullanıcının yapay zekayı kandırmaya (sistem promptunu unutturmaya,
 * API anahtarı istemeye veya güvenlik filtrelerini aşmaya) yönelik
 * kalıplarını regex ile tespit eder.
 */
const SUSPICIOUS_PROMPT_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+prompt/i,
  /developer\s+mode/i,
  /reveal\s+(your\s+)?(api[_\s-]?key|secret|system\s+instructions)/i,
  /print\s+(your\s+)?(api[_\s-]?key|secret|prompt)/i,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /simulated\s+dan/i,
  /bypass\s+(safety|content\s+filter)/i,
  /tüm\s+talimatlar[ıi]\s+unut/i,
  /sistem\s+talimatlar[ıi]n[ıi]\s+yaz/i,
  /api\s+anahtar[ıi]n[ıi]\s+(ver|yaz|göster)/i,
];

export interface PromptSecurityCheck {
  isSafe: boolean;
  sanitizedText: string;
  flaggedPattern?: string;
}

/**
 * Bir kullanıcı metninin Prompt Injection içerip içermediğini doğrular.
 */
export function validatePromptSafety(prompt: string): PromptSecurityCheck {
  if (!prompt || typeof prompt !== 'string') {
    return { isSafe: true, sanitizedText: '' };
  }

  // Karakter uzunluğu kontrolü
  if (prompt.length > MAX_USER_PROMPT_LENGTH) {
    return {
      isSafe: false,
      sanitizedText: prompt.slice(0, MAX_USER_PROMPT_LENGTH),
      flaggedPattern: `Maksimum karakter sınırı aşıldı (${prompt.length}/${MAX_USER_PROMPT_LENGTH})`,
    };
  }

  for (const pattern of SUSPICIOUS_PROMPT_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        isSafe: false,
        sanitizedText: sanitizeInput(prompt, MAX_USER_PROMPT_LENGTH),
        flaggedPattern: pattern.source,
      };
    }
  }

  return {
    isSafe: true,
    sanitizedText: sanitizeInput(prompt, MAX_USER_PROMPT_LENGTH),
  };
}

/**
 * Güvenli URI Doğrulayıcı:
 * Yalnızca meşru protokolleri ('https:', 'http:', 'file:', 'data:image/') onaylar.
 * 'javascript:', 'data:text/html' veya phishing protokollerini engeller.
 */
export function isSafeUri(uri?: string | null): boolean {
  if (!uri || typeof uri !== 'string') return false;

  const trimmed = uri.trim().toLowerCase();

  // Tehlikeli protokoller
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:text/html')
  ) {
    return false;
  }

  // Kabul edilen güvenli protokoller
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('ph://') // iOS Photos asset
  );
}
