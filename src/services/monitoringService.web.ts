/**
 * Lumière Sucrée — Web Monitoring Servisi (Platform Safe)
 *
 * Web ortamında Metro bundler ESM uyumsuzluklarını önlerken
 * aynı izleme API'sini (Sentry benzeri) kesintisiz sağlar.
 */

let webUser: { id: string } | null = null;

export function initMonitoring() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    console.log('[Web Monitoring] Sentry DSN tespit edildi (Web ortamı aktif).');
  } else {
    console.log('[Web Monitoring] Yerel web geliştirme modunda izleme aktif.');
  }
}

export function captureException(error: unknown, context?: Record<string, any>) {
  console.error('[Web Monitoring Exception]:', error, context);
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: string = 'info') {
  console.log(`[Web Monitoring Message - ${level}]:`, message);
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureMessage(message, level);
  }
}

// Sadece hesap kimliği gönderilir; e-posta ve ad Sentry'ye gitmez.
export function setMonitoringUser(user: { id: string }) {
  webUser = { id: user.id };
  console.log('[Web Monitoring] Kullanıcı oturumu bağlandı:', user.id);
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.setUser({ id: user.id });
  }
}

export function clearMonitoringUser() {
  webUser = null;
  console.log('[Web Monitoring] Kullanıcı oturumu temizlendi.');
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.setUser(null);
  }
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  console.log(`[Web Breadcrumb - ${category}]: ${message}`, data || '');
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb({ category, message, data });
  }
}
