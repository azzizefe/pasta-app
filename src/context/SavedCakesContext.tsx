import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedCake, SavedCakeFilter } from '../types/savedCake';

const STORAGE_KEY = '@lumiere_saved_cakes_v1';

interface SavedCakesContextType {
  savedCakes: SavedCake[];
  isLoading: boolean;
  saveCake: (
    cakeData: Omit<SavedCake, 'id' | 'createdAt'>
  ) => Promise<SavedCake>;
  deleteCake: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  isCakeSaved: (identifier: string) => boolean;
  getCakeById: (id: string) => SavedCake | undefined;
  filter: SavedCakeFilter;
  setFilter: (filter: SavedCakeFilter) => void;
  filteredCakes: SavedCake[];
  clearAll: () => Promise<void>;
}

const SavedCakesContext = createContext<SavedCakesContextType | undefined>(
  undefined
);

export function SavedCakesProvider({ children }: { children: React.ReactNode }) {
  const [savedCakes, setSavedCakes] = useState<SavedCake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<SavedCakeFilter>('all');

  // Depolamadan kayıtlı pastaları yükle
  useEffect(() => {
    async function loadCakes() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SavedCake[] = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSavedCakes(parsed);
          }
        }
      } catch (err) {
        console.warn('Saved cakes yüklenemedi:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCakes();
  }, []);

  // AsyncStorage'a kalıcı olarak yaz
  const persistCakes = useCallback(async (cakes: SavedCake[]) => {
    setSavedCakes(cakes);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cakes));
    } catch (err) {
      console.warn('Saved cakes kaydedilemedi:', err);
    }
  }, []);

  // Yeni pasta kaydet
  const saveCake = useCallback(
    async (cakeData: Omit<SavedCake, 'id' | 'createdAt'>): Promise<SavedCake> => {
      const newCake: SavedCake = {
        ...cakeData,
        id: `cake_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        isFavorite: cakeData.isFavorite ?? false,
      };

      const updated = [newCake, ...savedCakes];
      await persistCakes(updated);
      return newCake;
    },
    [savedCakes, persistCakes]
  );

  // Pasta sil
  const deleteCake = useCallback(
    async (id: string) => {
      const updated = savedCakes.filter((c) => c.id !== id);
      await persistCakes(updated);
    },
    [savedCakes, persistCakes]
  );

  // Favori durumunu değiştir
  const toggleFavorite = useCallback(
    async (id: string) => {
      const updated = savedCakes.map((c) =>
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      );
      await persistCakes(updated);
    },
    [savedCakes, persistCakes]
  );

  // Prompt veya görsel URI üzerinden kayıtlı olup olmadığını kontrol et
  const isCakeSaved = useCallback(
    (identifier: string) => {
      return savedCakes.some(
        (c) => c.id === identifier || c.prompt === identifier || c.imageUri === identifier
      );
    },
    [savedCakes]
  );

  const getCakeById = useCallback(
    (id: string) => savedCakes.find((c) => c.id === id),
    [savedCakes]
  );

  const clearAll = useCallback(async () => {
    await persistCakes([]);
  }, [persistCakes]);

  // Filtreye göre filtrelenmiş liste
  const filteredCakes = savedCakes.filter((cake) => {
    if (filter === 'all') return true;
    if (filter === 'favorites') return !!cake.isFavorite;
    return cake.kind === filter;
  });

  return (
    <SavedCakesContext.Provider
      value={{
        savedCakes,
        isLoading,
        saveCake,
        deleteCake,
        toggleFavorite,
        isCakeSaved,
        getCakeById,
        filter,
        setFilter,
        filteredCakes,
        clearAll,
      }}
    >
      {children}
    </SavedCakesContext.Provider>
  );
}

export function useSavedCakes() {
  const context = useContext(SavedCakesContext);
  if (!context) {
    throw new Error('useSavedCakes must be used within a SavedCakesProvider');
  }
  return context;
}
