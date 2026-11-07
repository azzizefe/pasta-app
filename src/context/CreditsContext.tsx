import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CakeKind, ImageQuality } from '../types/savedCake';

const STORAGE_KEY = '@lumiere_user_credits_v1';
const SECOND_CAKE_OFFER_KEY = '@lumiere_second_cake_offer_v1';

/**
 * The second-cake discount is offered exactly once, ever:
 * available → offered (shown under the first cake's result)
 *   → claimed (user tapped the offer) → used (the discounted cake was generated)
 *   → expired (user left the result screen without tapping it)
 */
type SecondCakeOfferStatus = 'available' | 'offered' | 'claimed' | 'used' | 'expired';
const SECOND_CAKE_OFFER_STATUSES: SecondCakeOfferStatus[] = [
  'available',
  'offered',
  'claimed',
  'used',
  'expired',
];
// Hoş geldin hediyesi: 15 kredi. Veritabanındaki
// public.welcome_credits() ile aynı olmalı (supabase/migrations/20261023_hosgeldin_kredisi_30.sql).
export const INITIAL_CREDITS = 15;
export const CREDITS_PER_GENERATION = 15;
export const SECOND_CAKE_DISCOUNT_CREDITS = 10;
// Display-only "was" price shown struck through next to the real cost (20 krediden 15 krediye)
export const CREDITS_PER_GENERATION_LIST_PRICE = 20;
export const CREDITS_PER_GENERATION_4K = 15;

/** A spend or top-up must be a whole, positive number; anything else is refused. */
function toCreditAmount(amount: number): number | null {
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

/** The balance is a whole number that never drops below 0. */
function toBalance(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function getGenerationCost(_quality?: ImageQuality, kind?: CakeKind, isDiscounted?: boolean) {
  if (isDiscounted) {
    return SECOND_CAKE_DISCOUNT_CREDITS;
  }
  if (kind === 'diy') {
    return 15;
  }
  return CREDITS_PER_GENERATION;
}

export function getGenerationListPrice(kind?: CakeKind) {
  if (kind === 'diy') {
    return 20;
  }
  return CREDITS_PER_GENERATION_LIST_PRICE;
}

type CreditsContextType = {
  credits: number;
  creditsPerGeneration: number;
  isLoading: boolean;
  /** The user claimed the one-time offer; their next cake costs 10 credits. */
  isSecondCakeDiscountActive: boolean;
  /** The one-time offer card should be shown right now. */
  isSecondCakeOfferVisible: boolean;
  /** Call after a cake is generated: shows the offer if it was never shown. */
  offerSecondCakeDiscount: () => void;
  claimSecondCakeDiscount: () => void;
  /** The offer was shown but not taken; it never comes back. */
  dismissSecondCakeOffer: () => void;
  consumeSecondCakeDiscount: () => void;
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
  // null until loaded from storage; no transition happens before that.
  const [secondCakeOffer, setSecondCakeOffer] = useState<SecondCakeOfferStatus | null>(null);
  const secondCakeOfferRef = useRef<SecondCakeOfferStatus | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SECOND_CAKE_OFFER_KEY)
      .then((stored) => {
        const status = SECOND_CAKE_OFFER_STATUSES.includes(stored as SecondCakeOfferStatus)
          ? (stored as SecondCakeOfferStatus)
          : 'available';
        secondCakeOfferRef.current = status;
        setSecondCakeOffer(status);
      })
      .catch((err) => console.warn('İkinci pasta teklifi yüklenemedi:', err));
  }, []);

  /** Moves the offer from one status to the next; ignored from any other status. */
  const moveSecondCakeOffer = useCallback(
    (from: SecondCakeOfferStatus, to: SecondCakeOfferStatus) => {
      if (secondCakeOfferRef.current !== from) return;
      secondCakeOfferRef.current = to;
      setSecondCakeOffer(to);
      AsyncStorage.setItem(SECOND_CAKE_OFFER_KEY, to).catch((err) => {
        console.warn('İkinci pasta teklifi kaydedilemedi:', err);
      });
    },
    [],
  );

  const offerSecondCakeDiscount = useCallback(
    () => moveSecondCakeOffer('available', 'offered'),
    [moveSecondCakeOffer],
  );
  const claimSecondCakeDiscount = useCallback(
    () => moveSecondCakeOffer('offered', 'claimed'),
    [moveSecondCakeOffer],
  );
  const dismissSecondCakeOffer = useCallback(
    () => moveSecondCakeOffer('offered', 'expired'),
    [moveSecondCakeOffer],
  );
  const consumeSecondCakeDiscount = useCallback(
    () => moveSecondCakeOffer('claimed', 'used'),
    [moveSecondCakeOffer],
  );

  // Depolamadan bakiyeyi yükle — AsyncStorage hem native (iOS/Android) hem
  // web'de çalışır, önceki window.localStorage kontrolü sadece web'de
  // işliyordu ve gerçek cihazda her açılışta bakiyeyi 25'e sıfırlıyordu.
  useEffect(() => {
    async function loadCredits() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          // A tampered or corrupt value (negative, text) counts as 0, never as a fresh start.
          const balance = toBalance(Number(stored));
          balanceRef.current = balance;
          setCredits(balance);
          if (String(balance) !== stored) {
            await AsyncStorage.setItem(STORAGE_KEY, String(balance));
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

  // Async flows (generate → refund, purchase) call these long after render, so they
  // must read the live balance rather than the value captured when they were created.
  const balanceRef = useRef(INITIAL_CREDITS);

  // On the web every open tab holds its own copy of the balance; follow the other tabs'
  // writes so two tabs can't each spend the same credits.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      const balance = toBalance(Number(event.newValue));
      balanceRef.current = balance;
      setCredits(balance);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persistCredits = useCallback((newAmount: number) => {
    const balance = toBalance(newAmount);
    balanceRef.current = balance;
    setCredits(balance);
    AsyncStorage.setItem(STORAGE_KEY, String(balance)).catch((err) => {
      console.warn('Kredi bakiyesi kaydedilemedi:', err);
    });
  }, []);

  const addCredits = useCallback(
    (amount: number) => {
      // A negative "top-up" would be a back door for spending past zero.
      const credit = toCreditAmount(amount);
      if (credit === null) return;
      persistCredits(balanceRef.current + credit);
    },
    [persistCredits],
  );

  const hasEnoughCredits = useCallback(
    (amount: number = CREDITS_PER_GENERATION) => {
      const cost = toCreditAmount(amount);
      const balance = balanceRef.current;
      return cost !== null && balance > 0 && balance >= cost;
    },
    // Re-created on every balance change so consumers re-render with fresh answers.
    [credits],
  );

  /** Takes the credits for one generation; returns false (and takes nothing) if it can't. */
  const deductCredits = useCallback(
    (amount: number = CREDITS_PER_GENERATION) => {
      // A negative cost would turn a spend into a top-up (-1000 "spent" = +1000 credits).
      const cost = toCreditAmount(amount);
      const balance = balanceRef.current;
      if (cost === null || balance <= 0 || balance < cost) {
        return false;
      }
      persistCredits(balance - cost);
      return true;
    },
    [persistCredits],
  );

  const openPurchaseModal = useCallback(() => setIsPurchaseModalOpen(true), []);
  const closePurchaseModal = useCallback(() => setIsPurchaseModalOpen(false), []);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        creditsPerGeneration: CREDITS_PER_GENERATION,
        isLoading,
        isSecondCakeDiscountActive: secondCakeOffer === 'claimed',
        isSecondCakeOfferVisible: secondCakeOffer === 'offered',
        offerSecondCakeDiscount,
        claimSecondCakeDiscount,
        dismissSecondCakeOffer,
        consumeSecondCakeDiscount,
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
