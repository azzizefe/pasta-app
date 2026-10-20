import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  LanguageInfo,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  translations,
} from '../i18n/translations';
import { addBreadcrumb } from '../services/monitoringService';

const STORAGE_KEY = '@lumiere_selected_language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
  isRTL: boolean;
  t: (path: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>('tr');
  const [isReady, setIsReady] = useState(false);

  // Cihaz dilini ve depolanmış tercihi yükle
  useEffect(() => {
    async function initLanguage() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'tr' || stored === 'en' || stored === 'fr' || stored === 'ar')) {
          setLanguageState(stored as SupportedLanguage);
        } else {
          // Cihaz dilini algıla
          const locales = getLocales();
          const deviceCode = locales?.[0]?.languageCode?.toLowerCase() || '';

          let detected: SupportedLanguage = 'en'; // Global varsayılan
          if (deviceCode.startsWith('tr')) detected = 'tr';
          else if (deviceCode.startsWith('fr')) detected = 'fr';
          else if (deviceCode.startsWith('ar')) detected = 'ar';

          setLanguageState(detected);
          await AsyncStorage.setItem(STORAGE_KEY, detected);
        }
      } catch (err) {
        console.warn('[LanguageContext] Dil başlatılamadı:', err);
      } finally {
        setIsReady(true);
      }
    }
    initLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
      addBreadcrumb('i18n', `Language switched to: ${newLang}`);
    } catch (err) {
      console.warn('[LanguageContext] Dil kaydedilemedi:', err);
    }
  }, []);

  const currentLanguageInfo = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [language]);

  /**
   * Nested dot-notation ile çeviri metnine ulaşır (örn: t('tabs.home'))
   */
  const t = useCallback(
    (path: string, fallback?: string): string => {
      const keys = path.split('.');
      let current: any = translations[language];

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Seçili dilde yoksa İngilizce fallback dene
          let enCurrent: any = translations.en;
          for (const enKey of keys) {
            if (enCurrent && typeof enCurrent === 'object' && enKey in enCurrent) {
              enCurrent = enCurrent[enKey];
            } else {
              return fallback || path;
            }
          }
          return typeof enCurrent === 'string' ? enCurrent : fallback || path;
        }
      }

      return typeof current === 'string' ? current : fallback || path;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo,
      isRTL: currentLanguageInfo.isRTL,
      t,
    }),
    [language, setLanguage, currentLanguageInfo, t]
  );

  if (!isReady) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage, LanguageProvider içinde kullanılmalıdır.');
  }
  return context;
}

export function useTranslation() {
  const { t, language, isRTL } = useLanguage();
  return { t, language, isRTL };
}
