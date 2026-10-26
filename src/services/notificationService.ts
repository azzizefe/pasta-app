import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  describeLeadTime,
  getNextReminderDate,
  getReminderLeadDays,
  OCCASION_TYPE_INFO,
  SpecialOccasion,
} from '../types/occasion';

export const NOTIFICATIONS_ENABLED_KEY = '@lumiere_notifications_enabled_v1';

// Uygulama açıkken bildirimin nasıl gösterileceğini ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Kullanıcıdan yerel bildirim izni ister
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Özel gün için seçilen gün kadar öncesine, sabah 10:00'a bildirim kurar
 */
export async function scheduleOccasionReminder(
  occasion: SpecialOccasion
): Promise<string | undefined> {
  try {
    const isEnabled = await areNotificationsEnabled();
    if (!isEnabled) {
      console.log('Bildirimler kullanıcı tarafından kapatılmış.');
      return undefined;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Bildirim izni verilmedi.');
      return undefined;
    }

    const typeInfo = OCCASION_TYPE_INFO[occasion.type];
    // Gün seçilen süreden yakınsa en yakın sabah 10:00'a çekilir
    const reminderDate = getNextReminderDate(
      occasion.month,
      occasion.day,
      occasion.reminderDaysBefore
    );
    const leadDays = getReminderLeadDays(occasion.month, occasion.day, reminderDate);
    const now = new Date();

    const triggerSeconds = Math.max(
      10,
      Math.round((reminderDate.getTime() - now.getTime()) / 1000)
    );

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title:
          leadDays === 0
            ? `${typeInfo.icon} Bugün ${occasion.personName}'in ${typeInfo.label}!`
            : `${typeInfo.icon} ${occasion.personName}'in ${typeInfo.label} Yaklaşıyor!`,
        body:
          leadDays === 0
            ? `Lumière Sucrée'de ona özel unutulmaz bir pasta tasarlamak için dokun ✨`
            : `Kutlamaya ${describeLeadTime(leadDays)} kaldı! Lumière Sucrée'de ona özel unutulmaz bir pasta tasarlamak için dokun ✨`,
        data: {
          occasionId: occasion.id,
          cakeKind: typeInfo.defaultKind,
          personName: occasion.personName,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
        repeats: false,
      },
    });

    console.log(
      `Bildirim programlandı: ${occasion.personName}, ${reminderDate.toLocaleDateString('tr-TR')}, ID: ${notificationId}`
    );

    return notificationId;
  } catch (err) {
    console.warn('Bildirim programlama hatası:', err);
    return undefined;
  }
}

/**
 * Programlanmış bildirimi iptal eder
 */
export async function cancelOccasionReminder(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('Bildirim iptal hatası:', err);
  }
}

/**
 * Hesap silinirken kalan tüm hatırlatıcıları iptal eder
 */
export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('Bildirimler iptal edilemedi:', err);
  }
}

/**
 * Anlık test bildirimi gönderir (5 saniye sonra çalar)
 */
export async function sendTestNotification(personName: string = 'Sevdiğiniz Biri') {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎂 2 Hafta Kaldı Hatırlatıcısı (Test)',
        body: `${personName}'in özel gününe 2 hafta kaldı! Ona özel lüks bir pasta tasarlayabilirsiniz ✨`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });
    return true;
  } catch (err) {
    console.warn('Test bildirimi hatası:', err);
    return false;
  }
}

/**
 * Bildirimlerin kullanıcı tarafından etkinleştirilip etkinleştirilmediğini kontrol eder
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (val === null) return true; // varsayılan açık
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Bildirimleri açar veya kapatır
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  try {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) return false;
    } else {
      await cancelAllReminders();
    }
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    return true;
  } catch (err) {
    console.warn('Bildirim tercihi kaydedilemedi:', err);
    return false;
  }
}
