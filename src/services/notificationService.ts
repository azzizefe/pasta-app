import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getNextOccasionDate,
  OCCASION_TYPE_INFO,
  SpecialOccasion,
} from '../types/occasion';

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
 * Özel gün için 14 gün (2 hafta) öncesine sabah 10:00'a bildirim kurar
 */
export async function scheduleOccasionReminder(
  occasion: SpecialOccasion
): Promise<string | undefined> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Bildirim izni verilmedi.');
      return undefined;
    }

    const typeInfo = OCCASION_TYPE_INFO[occasion.type];
    const eventDate = getNextOccasionDate(occasion.month, occasion.day);

    // 14 gün (2 hafta) öncesini hesapla
    const reminderDaysMs = occasion.reminderDaysBefore * 24 * 60 * 60 * 1000;
    let reminderDate = new Date(eventDate.getTime() - reminderDaysMs);

    // Sabah 10:00'a sabitle
    reminderDate.setHours(10, 0, 0, 0);

    const now = new Date();
    // Eğer bu yılın 14 gün öncesi zaten geçtiyse, seneye ayarla
    if (reminderDate.getTime() <= now.getTime()) {
      const nextYearEvent = new Date(
        eventDate.getFullYear() + 1,
        occasion.month - 1,
        occasion.day,
        10,
        0,
        0
      );
      reminderDate = new Date(nextYearEvent.getTime() - reminderDaysMs);
      reminderDate.setHours(10, 0, 0, 0);
    }

    const triggerSeconds = Math.max(
      10,
      Math.round((reminderDate.getTime() - now.getTime()) / 1000)
    );

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeInfo.icon} ${occasion.personName}'in ${typeInfo.label} Yaklaşıyor!`,
        body: `Kutlamaya tam 2 hafta kaldı! Lumière Sucrée'de ona özel unutulmaz bir pasta tasarlamak için dokun ✨`,
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
