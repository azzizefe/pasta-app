/**
 * Lumière Sucrée — Web Monitoring Servisi (Platform Safe)
 *
 * Web ortamında Metro bundler ESM uyumsuzluklarını önlerken
 * aynı izleme API'sini (Sentry benzeri) kesintisiz sağlar.
 */

let webUser: { id: string; email?: string | null; name?: string | null } | null = null;

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

export function setMonitoringUser(user: { id: string; email?: string | null; name?: string | null }) {
  webUser = user;
  console.log('[Web Monitoring] Kullanıcı oturumu bağlandı:', user.id);
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.setUser(user);
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
