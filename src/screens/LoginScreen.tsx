import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type LayoutChangeEvent,
  Linking,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/AuthButton';
import { AppleIcon, GoogleIcon } from '../components/BrandIcons';
import { signInWithApple, type AppleUser } from '../services/appleAuthService';
import { signInWithGoogle } from '../services/googleAuthService';
import { colors, fonts, spacing } from '../theme/theme';
import { PRIVACY_URL, TERMS_URL } from '../config/app';
import { useLanguage } from '../context/LanguageContext';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

/** Wall -> floor -> light falloff, mirroring a studio photo backdrop. */
const BACKDROP_COLORS = [
  '#BB7F78',
  '#BF837B',
  '#CA918A',
  '#E8BDB6',
  '#F5D6CF',
  '#FAE8E1',
  '#FCF5EF',
  '#FDFAF6',
] as const;

const BACKDROP_STOPS = [0, 0.2, 0.34, 0.44, 0.55, 0.72, 0.88, 1] as const;

/** Screen ratio of the cake stand's base that BACKDROP_STOPS were tuned for. */
const DESIGN_FLOOR = 0.427;
const WALL_END = 0.44;

/** Shifts the wall -> floor transition so it always sits under the cake stand. */
function backdropStops(floor: number): [number, number, ...number[]] {
  const k = Math.min(Math.max(floor, 0.3), 0.7) / DESIGN_FLOOR;
  const wallEnd = WALL_END * k;
  return BACKDROP_STOPS.map((s) =>
    s <= WALL_END ? s * k : wallEnd + ((s - WALL_END) * (1 - wallEnd)) / (1 - WALL_END),
  ) as [number, number, ...number[]];
}

const CAKE_IMAGE = require('../../assets/cake.png');

/** Intrinsic height / width of the cropped cake artwork (377x449). */
const CAKE_ASPECT = 449 / 377;

/** Keeps the buttons phone-sized on tablets and large web viewports. */
const CONTENT_MAX_WIDTH = 420;

const HERO_TOP_GAP = 16;

export type Provider = 'apple' | 'google';

type Props = {
  onSignIn: (provider: Provider, user?: AppleUser) => void;
};

export default function LoginScreen({ onSignIn }: Props) {
  useTx();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [authenticatingProvider, setAuthenticatingProvider] = useState<Provider | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [heroBox, setHeroBox] = useState<{ y: number; height: number } | null>(null);

  const isAuthenticating = authenticatingProvider !== null;

  const handleHeroLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height: h } = e.nativeEvent.layout;
    setHeroBox((prev) => (prev && prev.y === y && prev.height === h ? prev : { y, height: h }));
  }, []);

  // The hero flexes into all spare height; the cake fills it but is capped on
  // both axes so it never crops or crowds the buttons on short/narrow devices.
  const maxCakeHeight = Math.min(height * 0.48, width * 0.86 * CAKE_ASPECT);
  const cakeHeight = heroBox
    ? Math.max(0, Math.min(maxCakeHeight, heroBox.height - insets.top - HERO_TOP_GAP))
    : 0;
  const cakeWidth = cakeHeight / CAKE_ASPECT;
  const stops = backdropStops(heroBox ? (heroBox.y + heroBox.height) / height : DESIGN_FLOOR);

  // Sign in with Apple (App Store Kılavuz 4.8 uyumlu)
  const handleApple = useCallback(async () => {
    setAuthenticatingProvider('apple');
    setAuthError(null);
    try {
      const result = await signInWithApple();
      if (result.success && result.user) {
        onSignIn('apple', result.user);
      } else if (result.error) {
        setAuthError(result.error);
      }
    } catch (err: any) {
      setAuthError(err?.message || tx("Apple ile giriş sırasında bir hata oluştu."));
    } finally {
      setAuthenticatingProvider(null);
    }
  }, [onSignIn]);

  // Sign in with Google (Supabase OAuth & Google Cloud Console)
  const handleGoogle = useCallback(async () => {
    setAuthenticatingProvider('google');
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (result.success && result.user) {
        onSignIn('google', result.user);
      } else if (result.error) {
        setAuthError(result.error);
      }
    } catch (err: any) {
      setAuthError(err?.message || tx("Google ile giriş sırasında bir hata oluştu."));
    } finally {
      setAuthenticatingProvider(null);
    }
  }, [onSignIn]);

  const handleOpenTerms = () => {
    Linking.openURL(TERMS_URL).catch((err) => console.warn('Could not open terms:', err));
  };

  const handleOpenPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch((err) => console.warn('Could not open privacy:', err));
  };

  // Android has no native Apple sign-in; the old fallback signed people in as a fake demo user.
  const showApple = Platform.OS !== 'android';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={BACKDROP_COLORS}
        locations={stops}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View
          style={[styles.hero, { paddingTop: insets.top + HERO_TOP_GAP }]}
          onLayout={handleHeroLayout}
        >
          {cakeHeight > 0 && (
            <Image
              source={CAKE_IMAGE}
              style={{ width: cakeWidth, height: cakeHeight }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible
              accessibilityRole="image"
              accessibilityLabel={tx("Two-tier naked cake with berries and roses")}
            />
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.title} allowFontScaling={false}>
            {tx("Hoş Geldiniz")}
          </Text>

          <View style={styles.actions}>
            {showApple && (
              <AuthButton
                label={authenticatingProvider === 'apple' ? tx("Giriş yapılıyor...") : tx("Apple ile Giriş Yap")}
                icon={
                  authenticatingProvider === 'apple' ? (
                    <ActivityIndicator size="small" color="#FFFDF9" />
                  ) : (
                    <AppleIcon size={19} />
                  )
                }
                onPress={handleApple}
                disabled={isAuthenticating}
              />
            )}
            <AuthButton
              label={authenticatingProvider === 'google' ? tx("Giriş yapılıyor...") : tx("Google ile Giriş Yap")}
              icon={
                authenticatingProvider === 'google' ? (
                  <ActivityIndicator size="small" color="#555" />
                ) : (
                  <GoogleIcon size={20} />
                )
              }
              onPress={handleGoogle}
              disabled={isAuthenticating}
              style={showApple ? styles.stackedButton : undefined}
            />
          </View>

          {authError && (
            <Text style={styles.errorText}>{authError}</Text>
          )}
        </View>

        <View style={styles.spacer} />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.footerText}>
            {tx("Devam ederek ")}
            <Text style={styles.footerLink} onPress={handleOpenTerms}>
              {tx("Kullanım Koşulları")}
            </Text>
            {tx(" ve ")}
            <Text style={styles.footerLink} onPress={handleOpenPrivacy}>
              {tx("Gizlilik Politikası")}
            </Text>
            {tx("’nı kabul etmiş olursunuz.")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backdropTop,
  },
  content: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 26,
  },
  spacer: {
    flexGrow: 0.22,
    minHeight: 28,
  },
  title: {
    marginTop: 20,
    textAlign: 'center',
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 0.4,
    // Playfair sits a little high in its box on Android.
    lineHeight: Platform.select({ ios: 42, default: 46 }),
  },
  actions: {
    marginTop: 18,
  },
  stackedButton: {
    marginTop: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#9E2A2B',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    textAlign: 'center',
    color: colors.inkMuted,
    fontSize: 12.5,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  footerLink: {
    color: colors.inkSoft,
    fontWeight: '600',
  },
});
