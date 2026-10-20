import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import CakeBuilderScreen, { type CakeKind } from './src/screens/CakeBuilderScreen';
import CreditsScreen from './src/screens/CreditsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen, { type Provider } from './src/screens/LoginScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors } from './src/theme/theme';

type MainAppProps = {
  signedIn: boolean;
  currentUser: AppleUser | null;
  onSignIn: (provider: Provider, user?: AppleUser) => void;
  onSignOut: () => void;
  builderKind: CakeKind | null;
  onOpenBuilder: (kind: CakeKind) => void;
  onCloseBuilder: () => void;
};

function MainApp({
  signedIn,
  currentUser,
  onSignIn,
  onSignOut,
  builderKind,
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
            onSignOut={onSignOut}
            onOpenBuilder={onOpenBuilder}
          />
          {/* Covers the tab screens like a modal; Home's own state survives
              underneath since it never unmounts while the builder is open. */}
          {builderKind && (
            <View style={StyleSheet.absoluteFill}>
              <CakeBuilderScreen kind={builderKind} onClose={onCloseBuilder} />
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
  const [currentUser, setCurrentUser] = useState<AppleUser | null>(null);
  const [builderKind, setBuilderKind] = useState<CakeKind | null>(null);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
  });

  // Sentry izleme servisini ve Retention analitiğini başlat
  React.useEffect(() => {
    initMonitoring();
    trackAppLaunchAndRetention();
  }, []);

  const handleSignIn = useCallback((provider: Provider, user?: AppleUser) => {
    console.log(`Signed in with ${provider}`, user);
    if (user) {
      setCurrentUser(user);
      setMonitoringUser(user);
    }
    setSignedIn(true);
  }, []);

  const handleSignOut = useCallback(() => {
    setSignedIn(false);
    setCurrentUser(null);
    clearMonitoringUser();
    setBuilderKind(null);
  }, []);

  const handleOpenBuilder = useCallback((kind: CakeKind) => {
    setBuilderKind(kind);
  }, []);

  const handleCloseBuilder = useCallback(() => {
    setBuilderKind(null);
  }, []);

  // Hold on the backdrop colour so the display font never pops in mid-render.
  if (!fontsLoaded) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <CreditsProvider>
            <SavedCakesProvider>
              <OccasionsProvider>
                <MainApp
                  signedIn={signedIn}
                  currentUser={currentUser}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                  builderKind={builderKind}
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
