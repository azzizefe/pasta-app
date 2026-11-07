import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { I18nManager, Platform, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/languages';
import { getDeviceRegion, getFormatLocale, resolveAppLanguage } from '../i18n/region';
import { setTxLanguage, tx } from '../i18n/tx';

/** Key of the old manual language choice. The language now follows the device's country only. */
const LEGACY_STORAGE_KEY = '@lumiere_selected_language';

interface LanguageContextType {
  language: SupportedLanguage;
  /** BCP 47 tag for dates and numbers, e.g. "tr-TR". */
  formatLocale: string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Lays the app out right-to-left for Arabic, whatever the phone's own language.
 * The root View's `direction` covers the screens at once. Modals are separate native roots, so the
 * native setting is switched too; it takes effect from the next launch. On web the page's `dir` does it.
 */
function applyLayoutDirection(isRTL: boolean) {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    return;
  }
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Re-read when the device's language or region setting changes.
  const locales = useLocales();
  const language = useMemo(() => resolveAppLanguage(locales), [locales]);
  const formatLocale = useMemo(
    () => getFormatLocale(language, getDeviceRegion(locales)),
    [language, locales]
  );
  // Keep the phrase translator in step before any child renders.
  setTxLanguage(language, formatLocale);

  const isRTL = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.isRTL ?? false;

  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    applyLayoutDirection(isRTL);
  }, [isRTL]);

  const value = useMemo(() => ({ language, formatLocale, isRTL }), [language, formatLocale, isRTL]);

  return (
    <LanguageContext.Provider value={value}>
      <View style={[styles.root, { direction: isRTL ? 'rtl' : 'ltr' }]}>{children}</View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage, LanguageProvider içinde kullanılmalıdır.');
  }
  return context;
}

/** Phrase translator for components; subscribing to the context re-renders them on language change. */
export function useTx() {
  useLanguage();
  return tx;
}
