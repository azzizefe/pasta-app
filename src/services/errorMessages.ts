import { tx } from '../i18n/tx';

/**
 * Turns error replies from our server, Google, the stores and sign-in SDKs into text in the
 * app's language. Their own messages are Turkish or English, so they are never shown as is.
 */

/** Codes sent by server/express-server.js and server/prompt-guard.js. */
export function messageForErrorCode(code: unknown): string | null {
  switch (code) {
    case 'PROMPT_MISSING':
      return tx("Pasta açıklaması boş olamaz.");
    case 'PROMPT_TOO_LONG':
      return tx("Tasarım açıklaması çok uzun. Lütfen ek isteklerini veya düzenleme notunu kısaltıp tekrar dene.");
    case 'PROMPT_SECURITY_VIOLATION':
      return tx("Yazdığın metinde güvenlik nedeniyle işlenemeyen bir ifade var. Lütfen ek isteklerini pastayla ilgili olacak şekilde yeniden yaz.");
    case 'INVALID_INPUT':
      return tx("Pasta bilgileri okunamadı. Lütfen tekrar dene.");
    case 'INVALID_IMAGE':
      return tx("İlham fotoğrafı okunamadı. Lütfen JPEG, PNG veya WEBP bir fotoğraf seç.");
    case 'IMAGE_TOO_LARGE':
      return tx("İlham fotoğrafı çok büyük (en fazla 8 MB).");
    case 'EMPTY_OUTPUT':
    case 'OUTPUT_REJECTED':
      return tx("Yapay zeka bu sefer geçerli bir yanıt vermedi. Lütfen tekrar dene.");
    case 'RATE_LIMIT_EXCEEDED':
      return tx("Çok fazla pasta tasarlama isteği gönderildi. Lütfen 1 dakika sonra tekrar deneyiniz.");
    default:
      return null;
  }
}

/** Text for a failed reply from our server or from Google, picked by its code and HTTP status. */
export function messageForHttpError(status: number, body?: any): string {
  const byCode = messageForErrorCode(body?.code) || messageForErrorCode(body?.error);
  if (byCode) return byCode;
  if (status === 429) return messageForErrorCode('RATE_LIMIT_EXCEEDED') as string;
  if (status >= 500) return tx("Tasarım servisine şu an ulaşılamıyor. Lütfen birkaç dakika sonra tekrar dene.");
  return tx("Sunucu Hatası ({status})", { status });
}

/** RevenueCat error codes (PURCHASES_ERROR_CODE), checked when a purchase or restore fails. */
export function messageForStoreError(error: any, fallback: string): string {
  switch (String(error?.code ?? '')) {
    case '20':
      return tx("Ödemen onay bekliyor. Onaylandığında kredilerin hesabına eklenecek.");
    case '3':
      return tx("Bu cihazda satın alma yapılmasına izin verilmiyor.");
    case '10':
      return tx("Ağ bağlantı hatası oluştu.");
    default:
      return fallback;
  }
}
