import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

import { CreditsProvider, useCredits } from './src/context/CreditsContext';
import { SavedCakesProvider } from './src/context/SavedCakesContext';
import { OccasionsProvider } from './src/context/OccasionsContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { type AppleUser } from './src/services/appleAuthService';
import {
  initMonitoring,
  setMonitoringUser,
  clearMonitoringUser,
} from './src/services/monitoringService';
import { trackAppLaunchAndRetention } from './src/services/analyticsService';
import { deleteFullUserAccount, wipeLocalAccountData } from './src/services/accountService';
import CakeBuilderScreen, { type CakeKind } from './src/screens/CakeBuilderScreen';
import { type CakeDetails } from './src/types/savedCake';
import CreditsScreen from './src/screens/CreditsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen, { type Provider } from './src/screens/LoginScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors } from './src/theme/theme';

const AUTH_SESSION_KEY = '@lumiere_auth_session_v1';

type MainAppProps = {
  signedIn: boolean;
  currentUser: AppleUser | null;
  authProvider: Provider | null;
  onSignIn: (provider: Provider, user?: AppleUser) => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  builderKind: CakeKind | null;
  builderDetails: CakeDetails | null;
  onOpenBuilder: (kind: CakeKind, details?: CakeDetails) => void;
  onCloseBuilder: () => void;
};

function MainApp({
  signedIn,
  currentUser,
  authProvider,
  onSignIn,
  onSignOut,
  onDeleteAccount,
  builderKind,
  builderDetails,
  onOpenBuilder,
  onCloseBuilder,
}: MainAppProps) {
  const { isPurchaseModalOpen, closePurchaseModal } = useCredits();

  return (
    <View style={styles.stack}>
      {signedIn ? (
        <View style={styles.stack}>
          <HomeScreen
            userName={currentUser?.name || undefined}
            userEmail={currentUser?.email || undefined}
            authProvider={authProvider}
            onSignOut={onSignOut}
            onDeleteAccount={onDeleteAccount}
            onOpenBuilder={onOpenBuilder}
          />
          {/* Covers the tab screens like a modal; Home's own state survives
              underneath since it never unmounts while the builder is open. */}
          {builderKind && (
            <View style={StyleSheet.absoluteFill}>
              <CakeBuilderScreen
                kind={builderKind}
                initialDetails={builderDetails ?? undefined}
                onClose={onCloseBuilder}
              />
            </View>
          )}
        </View>
      ) : (
        <LoginScreen onSignIn={onSignIn} />
      )}

      {/* Kredilerim ve Mağaza Tam Sayfa Ekranı */}
      {isPurchaseModalOpen && (
        <View style={StyleSheet.absoluteFill}>
          <CreditsScreen onClose={closePurchaseModal} />
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppleUser | null>(null);
  const [authProvider, setAuthProvider] = useState<Provider | null>(null);
  const [builderKind, setBuilderKind] = useState<CakeKind | null>(null);
  const [builderDetails, setBuilderDetails] = useState<CakeDetails | null>(null);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
  });

  // Sentry izleme servisini, Retention analitiğini ve kayıtlı oturumu başlat
  React.useEffect(() => {
    initMonitoring();
    trackAppLaunchAndRetention();

    AsyncStorage.getItem(AUTH_SESSION_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          // Sahte demo hesaplarını temizle — ilk açılışta ve gerçek giriş öncesinde LoginScreen gelsin
          const isDemoUser =
            parsed?.user?.id === 'google_user_demo' ||
            (typeof parsed?.user?.id === 'string' && parsed.user.id.startsWith('apple_demo_user_'));

          if (isDemoUser) {
            AsyncStorage.removeItem(AUTH_SESSION_KEY).catch(() => {});
            setSignedIn(false);
          } else if (parsed?.signedIn) {
            if (parsed.user) {
              setCurrentUser(parsed.user);
              setMonitoringUser(parsed.user);
            }
            if (parsed.provider) {
              setAuthProvider(parsed.provider);
            }
            setSignedIn(true);
          }
        }
      })
      .catch((err) => {
        console.warn('Oturum bilgisi okunamadı:', err);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  const handleSignIn = useCallback((provider: Provider, user?: AppleUser) => {
    console.log(`Signed in with ${provider}`, user);
    if (user) {
      setCurrentUser(user);
      setMonitoringUser(user);
    }
    setAuthProvider(provider);
    setSignedIn(true);
    AsyncStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ signedIn: true, provider, user: user || null }),
    ).catch((err) => console.warn('Oturum kaydedilemedi:', err));
  }, []);

  const handleSignOut = useCallback(() => {
    setSignedIn(false);
    setCurrentUser(null);
    setAuthProvider(null);
    clearMonitoringUser();
    setBuilderKind(null);
    setBuilderDetails(null);
    AsyncStorage.removeItem(AUTH_SESSION_KEY).catch(() => {});
  }, []);

  // Bumping this remounts every data provider, so in-memory credits, designs and
  // special days reload from the now-empty storage instead of surviving deletion.
  const [dataGeneration, setDataGeneration] = useState(0);

  const handleDeleteAccount = useCallback(async () => {
    try {
      await deleteFullUserAccount(currentUser?.identityToken);
    } catch (err) {
      console.warn('Hesap verileri silinemedi:', err);
    }
    setDataGeneration((g) => g + 1);
    handleSignOut();
  }, [currentUser, handleSignOut]);

  const handleOpenBuilder = useCallback((kind: CakeKind, details?: CakeDetails) => {
    setBuilderDetails(details ?? null);
    setBuilderKind(kind);
  }, []);

  const handleCloseBuilder = useCallback(() => {
    setBuilderKind(null);
    setBuilderDetails(null);
  }, []);

  // Hold on the backdrop colour so the display font never pops in mid-render.
  if (!fontsLoaded || !authReady) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider key={dataGeneration}>
          <CreditsProvider>
            <SavedCakesProvider>
              <OccasionsProvider>
                <MainApp
                  signedIn={signedIn}
                  currentUser={currentUser}
                  authProvider={authProvider}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                  onDeleteAccount={handleDeleteAccount}
                  builderKind={builderKind}
                  builderDetails={builderDetails}
                  onOpenBuilder={handleOpenBuilder}
                  onCloseBuilder={handleCloseBuilder}
                />
              </OccasionsProvider>
            </SavedCakesProvider>
          </CreditsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.backdropTop,
  },
  stack: {
    flex: 1,
  },
});
