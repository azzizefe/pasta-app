import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lumiere_user_credits_v1';
export const INITIAL_CREDITS = 25; // 25 Kredi hoş geldin hediyesi
export const CREDITS_PER_GENERATION = 15;
// Display-only "was" price shown struck through next to the real cost.
export const CREDITS_PER_GENERATION_LIST_PRICE = 20;

type CreditsContextType = {
  credits: number;
  creditsPerGeneration: number;
  isLoading: boolean;
  addCredits: (amount: number) => void;
  deductCredits: (amount?: number) => boolean;
  hasEnoughCredits: (amount?: number) => boolean;
  isPurchaseModalOpen: boolean;
  openPurchaseModal: () => void;
  closePurchaseModal: () => void;
};

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number>(INITIAL_CREDITS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Depolamadan bakiyeyi yükle — AsyncStorage hem native (iOS/Android) hem
  // web'de çalışır, önceki window.localStorage kontrolü sadece web'de
  // işliyordu ve gerçek cihazda her açılışta bakiyeyi 25'e sıfırlıyordu.
  useEffect(() => {
    async function loadCredits() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            setCredits(parsed);
          }
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, String(INITIAL_CREDITS));
        }
      } catch (err) {
        console.warn('Kredi bakiyesi yüklenemedi:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCredits();
  }, []);

  const persistCredits = useCallback((newAmount: number) => {
    setCredits(newAmount);
    AsyncStorage.setItem(STORAGE_KEY, String(newAmount)).catch((err) => {
      console.warn('Kredi bakiyesi kaydedilemedi:', err);
    });
  }, []);

  const addCredits = useCallback(
    (amount: number) => {
      persistCredits(credits + amount);
    },
    [credits, persistCredits],
  );

  const hasEnoughCredits = useCallback(
    (amount: number = CREDITS_PER_GENERATION) => {
      return credits >= amount;
    },
    [credits],
  );

  const deductCredits = useCallback(
    (amount: number = CREDITS_PER_GENERATION) => {
      if (credits < amount) {
        return false;
      }
      persistCredits(credits - amount);
      return true;
    },
    [credits, persistCredits],
  );

  const openPurchaseModal = useCallback(() => setIsPurchaseModalOpen(true), []);
  const closePurchaseModal = useCallback(() => setIsPurchaseModalOpen(false), []);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        creditsPerGeneration: CREDITS_PER_GENERATION,
        isLoading,
        addCredits,
        deductCredits,
        hasEnoughCredits,
        isPurchaseModalOpen,
        openPurchaseModal,
        closePurchaseModal,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
