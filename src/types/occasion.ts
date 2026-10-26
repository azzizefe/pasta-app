import { CakeKind } from './savedCake';

export type OccasionType =
  | 'birthday'
  | 'anniversary'
  | 'wedding'
  | 'engagement'
  | 'celebration'
  | 'other';

export interface SpecialOccasion {
  id: string;
  personName: string;
  relationship?: string; // Örn: 'Eşim', 'Annem', 'Arkadaşım'
  title: string; // Örn: 'Elif'in Doğum Günü'
  month: number; // 1 - 12
  day: number; // 1 - 31
  year?: number; // Opsiyonel (yıl dönümü veya yaş hesabı için)
  type: OccasionType;
  notes?: string;
  reminderDaysBefore: number; // Kaç gün önce hatırlatılacak (varsayılan 14)
  notificationId?: string;
  createdAt: number;
}

export const OCCASION_TYPE_INFO: Record<
  OccasionType,
  { label: string; icon: string; defaultKind: CakeKind }
> = {
  birthday: { label: 'Doğum Günü', icon: '🎂', defaultKind: 'birthday' },
  anniversary: { label: 'Yıl Dönümü', icon: '💑', defaultKind: 'custom' },
  wedding: { label: 'Düğün', icon: '💍', defaultKind: 'wedding' },
  engagement: { label: 'Nişan', icon: '✨', defaultKind: 'engagement' },
  celebration: { label: 'Özel Kutlama', icon: '🎉', defaultKind: 'diy' },
  other: { label: 'Diğer', icon: '🍰', defaultKind: 'custom' },
};

/**
 * Bir sonraki etkinlik tarihini (Date objesi olarak) hesaplar.
 * Eğer bu yılki tarih geçtiyse, bir sonraki yıla ayarlar.
 */
export function getNextOccasionDate(month: number, day: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Ay 0-indekslidir; 29 Şubat artık yıl olmayan yıllarda 28 Şubat'ta kutlanır
  const inYear = (year: number) => {
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(day, lastDay), 10, 0, 0, 0);
  };
  let target = inYear(currentYear);

  // Eğer bugünün tarihi hedef tarihi geçtiyse, sonraki yıla al
  if (target.getTime() < now.getTime()) {
    target = inYear(currentYear + 1);
  }

  return target;
}

/**
 * Etkinliğe kaç gün kaldığını hesaplar.
 */
export function getDaysUntilOccasion(month: number, day: number): number {
  const now = new Date();
  // Saat farklarından etkilenmemek için gün başlangıcına sıfırla
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const target = getNextOccasionDate(month, day);
  const targetDateOnly = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  const diffMs = targetDateOnly.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Reminder lead times offered when adding an occasion, in days before the day. */
export const REMINDER_OPTIONS: Array<{ days: number; label: string; short: string }> = [
  { days: 0, label: 'Aynı gün', short: 'O gün' },
  { days: 1, label: '1 gün önce', short: '1 gün' },
  { days: 3, label: '3 gün önce', short: '3 gün' },
  { days: 7, label: '1 hafta önce', short: '1 hafta' },
  { days: 14, label: '2 hafta önce', short: '2 hafta' },
  { days: 30, label: '1 ay önce', short: '1 ay' },
];

/** "2 hafta", "1 ay", "3 gün": how far ahead a reminder lands, for copy. */
export function describeLeadTime(days: number): string {
  if (days === 7) return '1 hafta';
  if (days === 14) return '2 hafta';
  if (days === 30) return '1 ay';
  return `${days} gün`;
}

/**
 * The 10:00 morning the reminder fires. When the occasion is closer than the
 * chosen lead time, it fires on the next 10:00 instead of skipping this year.
 */
export function getNextReminderDate(month: number, day: number, daysBefore: number): Date {
  const now = new Date();
  const reminder = getNextOccasionDate(month, day);
  reminder.setDate(reminder.getDate() - daysBefore);
  reminder.setHours(10, 0, 0, 0);
  if (reminder.getTime() > now.getTime()) return reminder;

  const soonest = new Date(now);
  soonest.setHours(10, 0, 0, 0);
  if (soonest.getTime() <= now.getTime()) soonest.setDate(soonest.getDate() + 1);
  return soonest;
}

/** Whole days between the reminder morning and the occasion itself. */
export function getReminderLeadDays(month: number, day: number, reminder: Date): number {
  const event = getNextOccasionDate(month, day);
  const start = new Date(reminder.getFullYear(), reminder.getMonth(), reminder.getDate());
  const end = new Date(event.getFullYear(), event.getMonth(), event.getDate());
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}
