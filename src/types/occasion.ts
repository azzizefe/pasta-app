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
  reminderDaysBefore: number; // Varsayılan 14 gün (2 hafta)
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

  // JavaScript Date objesinde ay 0-indekslidir (0 = Ocak)
  let target = new Date(currentYear, month - 1, day, 10, 0, 0, 0);

  // Eğer bugünün tarihi hedef tarihi geçtiyse, sonraki yıla al
  if (target.getTime() < now.getTime()) {
    target = new Date(currentYear + 1, month - 1, day, 10, 0, 0, 0);
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
