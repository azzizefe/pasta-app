import * as Sentry from '@sentry/react-native';

/**
 * Lumière Sucrée — Sentry Hata ve Performans İzleme Servisi
 *
 * Canlı ortamda kullanıcıların karşılaştığı JavaScript ve Native çökmeleri (crash),
 * API hatalarını ve performans gecikmelerini izler.
 * EXPO_PUBLIC_SENTRY_DSN tanımlı olduğunda otomatik devreye girer.
 */

let isSentryInitialized = false;

export function initMonitoring() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.log('[Monitoring] Sentry DSN tanımlanmamış. Yerel geliştirme modunda hata yakalama aktif.');
    return;
  }

  try {
    Sentry.init({
      dsn,
      debug: false,
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'production',
      enableAutoSessionTracking: true,
    });
    isSentryInitialized = true;
    console.log('[Monitoring] Sentry izleme sistemi başarıyla başlatıldı.');
  } catch (error) {
    console.warn('[Monitoring] Sentry başlatılırken hata oluştu:', error);
  }
}

/**
 * Beklenmeyen bir hatayı veya istisnayı Sentry'ye kaydeder.
 */
export function captureException(error: unknown, context?: Record<string, any>) {
  console.error('[App Exception]:', error, context);

  if (isSentryInitialized) {
    try {
      if (context) {
        Sentry.setContext('additional_info', context);
      }
      Sentry.captureException(error);
    } catch (e) {
      console.warn('[Monitoring] Hata gönderilemedi:', e);
    }
  }
}

/**
 * Özel bir durum veya uyarı mesajını Sentry'ye iletir.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  console.log(`[App Message - ${level}]:`, message);

  if (isSentryInitialized) {
    try {
      Sentry.captureMessage(message, level);
    } catch (e) {
      console.warn('[Monitoring] Mesaj gönderilemedi:', e);
    }
  }
}

/**
 * Giriş yapan kullanıcının kimliğini oturuma bağlar.
 */
export function setMonitoringUser(user: { id: string; email?: string | null; name?: string | null }) {
  if (isSentryInitialized) {
    try {
      Sentry.setUser({
        id: user.id,
        email: user.email || undefined,
        username: user.name || undefined,
      });
    } catch (e) {
      console.warn('[Monitoring] Kullanıcı bilgisi atanamadı:', e);
    }
  }
}

/**
 * Kullanıcı çıkış yaptığında Sentry oturumunu temizler.
 */
export function clearMonitoringUser() {
  if (isSentryInitialized) {
    try {
      Sentry.setUser(null);
    } catch (e) {
      console.warn('[Monitoring] Kullanıcı bilgisi temizlenemedi:', e);
    }
  }
}

/**
 * Hata oluşmadan önceki kullanıcı adımlarını (Breadcrumb) günlüğe ekler.
 * Örneğin: "Düğün pastası seçildi", "İlham görseli yüklendi"
 */
export function addBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  if (isSentryInitialized) {
    try {
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: 'info',
      });
    } catch (e) {
      // sessizce geç
    }
  }
}
