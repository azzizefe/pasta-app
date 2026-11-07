import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDaysUntilOccasion,
  SpecialOccasion,
} from '../types/occasion';
import {
  cancelOccasionReminder,
  scheduleOccasionReminder,
  sendTestNotification,
} from '../services/notificationService';
import { tx } from '../i18n/tx';

const STORAGE_KEY = '@lumiere_special_occasions_v1';

// Kullanıcıya rehberlik edecek örnek başlangıç özel günleri
// Built when first seeded so the samples use the app language.
const buildSampleOccasions = (): Omit<SpecialOccasion, 'id' | 'createdAt'>[] => [
  {
    personName: tx('Annem'),
    relationship: tx('Anne'),
    title: tx("Annem'in Doğum Günü"),
    month: (new Date().getMonth() + 1) % 12 + 1, // Önümüzdeki ay
    day: 15,
    type: 'birthday',
    reminderDaysBefore: 14,
    notes: tx('Frambuazlı ve hafif şekerli pastaları çok sever.'),
  },
  {
    personName: tx('Eşim'),
    relationship: tx('Eş'),
    title: tx('Evlilik Yıl Dönümümüz'),
    month: ((new Date().getMonth() + 2) % 12) + 1, // 2 ay sonra
    day: 20,
    type: 'anniversary',
    reminderDaysBefore: 14,
    notes: tx('Altın detaylı zarif bir tasarım düşünülüyor.'),
  },
];

interface OccasionsContextType {
  occasions: SpecialOccasion[];
  upcomingOccasions: SpecialOccasion[];
  isLoading: boolean;
  addOccasion: (
    data: Omit<SpecialOccasion, 'id' | 'createdAt' | 'notificationId'>
  ) => Promise<SpecialOccasion>;
  updateOccasion: (
    id: string,
    data: Partial<Omit<SpecialOccasion, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteOccasion: (id: string) => Promise<void>;
  testNotification: (name?: string) => Promise<boolean>;
}

const OccasionsContext = createContext<OccasionsContextType | undefined>(
  undefined
);

export function OccasionsProvider({ children }: { children: React.ReactNode }) {
  const [occasions, setOccasions] = useState<SpecialOccasion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Depolamadan yükle
  useEffect(() => {
    async function loadOccasions() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SpecialOccasion[] = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setOccasions(parsed);
          }
        } else {
          // İlk kez açılıyorsa örnekleri yükle
          const samples: SpecialOccasion[] = buildSampleOccasions().map(
            (item, index) => ({
              ...item,
              id: `occ_sample_${index}_${Date.now()}`,
              createdAt: Date.now(),
            })
          );
          setOccasions(samples);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
        }
      } catch (err) {
        console.warn('Occasions yüklenemedi:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOccasions();
  }, []);

  const persistOccasions = useCallback(async (list: SpecialOccasion[]) => {
    setOccasions(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('Occasions kaydedilemedi:', err);
    }
  }, []);

  // Yeni özel gün ekle ve seçilen gün kadar öncesine bildirim kur
  const addOccasion = useCallback(
    async (
      data: Omit<SpecialOccasion, 'id' | 'createdAt' | 'notificationId'>
    ): Promise<SpecialOccasion> => {
      const newOccasion: SpecialOccasion = {
        ...data,
        id: `occ_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
      };

      // Seçilen gün kadar öncesine bildirimi kur
      const notificationId = await scheduleOccasionReminder(newOccasion);
      if (notificationId) {
        newOccasion.notificationId = notificationId;
      }

      const updated = [...occasions, newOccasion];
      await persistOccasions(updated);
      return newOccasion;
    },
    [occasions, persistOccasions]
  );

  // Özel günü güncelle
  const updateOccasion = useCallback(
    async (
      id: string,
      data: Partial<Omit<SpecialOccasion, 'id' | 'createdAt'>>
    ) => {
      const target = occasions.find((o) => o.id === id);
      if (!target) return;

      // Eski bildirimi iptal et ve yenisini kur
      if (target.notificationId) {
        await cancelOccasionReminder(target.notificationId);
      }

      const updatedOccasion: SpecialOccasion = {
        ...target,
        ...data,
      };

      const newNotifId = await scheduleOccasionReminder(updatedOccasion);
      updatedOccasion.notificationId = newNotifId;

      const updated = occasions.map((o) => (o.id === id ? updatedOccasion : o));
      await persistOccasions(updated);
    },
    [occasions, persistOccasions]
  );

  // Özel günü sil ve bildirimini iptal et
  const deleteOccasion = useCallback(
    async (id: string) => {
      const target = occasions.find((o) => o.id === id);
      if (target?.notificationId) {
        await cancelOccasionReminder(target.notificationId);
      }

      const updated = occasions.filter((o) => o.id !== id);
      await persistOccasions(updated);
    },
    [occasions, persistOccasions]
  );

  // Kalan güne göre en yakından en uzağa sırala
  const sortedOccasions = [...occasions].sort((a, b) => {
    return getDaysUntilOccasion(a.month, a.day) - getDaysUntilOccasion(b.month, b.day);
  });

  // Önümüzdeki 14 gün (2 hafta) içinde olanlar
  const upcomingOccasions = sortedOccasions.filter((o) => {
    const days = getDaysUntilOccasion(o.month, o.day);
    return days >= 0 && days <= 14;
  });

  const testNotification = useCallback(async (name?: string) => {
    return sendTestNotification(name);
  }, []);

  return (
    <OccasionsContext.Provider
      value={{
        occasions: sortedOccasions,
        upcomingOccasions,
        isLoading,
        addOccasion,
        updateOccasion,
        deleteOccasion,
        testNotification,
      }}
    >
      {children}
    </OccasionsContext.Provider>
  );
}

export function useOccasions() {
  const context = useContext(OccasionsContext);
  if (!context) {
    throw new Error('useOccasions must be used within an OccasionsProvider');
  }
  return context;
}
