import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { SparkleIcon, HomeIcon } from '../components/Icons';
import { fonts, home } from '../theme/theme';

export type NotFoundScreenProps = {
  code?: string | number;
  title?: string;
  subtitle?: string;
  frenchNote?: string;
  onGoHome: () => void;
  onRetry?: () => void;
};

export default function NotFoundScreen({
  code = '404',
  title = 'Bu Şaheser Bulunamadı',
  subtitle = 'Aradığınız özel pasta tasarımı haute couture menümüzden kaldırılmış, taşınmış ya da kısa bir mutfak molası verilmiş olabilir.',
  frenchNote = "Cette création n'est plus disponible dans nos ateliers",
  onGoHome,
  onRetry,
}: NotFoundScreenProps) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={[home.washTop, home.washMid, home.washEnd]}
        locations={[0, 0.35, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.container}>
        {/* Lüks Rozet & İkon */}
        <View style={styles.iconCircle}>
          <View style={styles.iconInnerCircle}>
            <SparkleIcon size={38} color={home.gold} />
          </View>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{code}</Text>
          </View>
        </View>

        {/* Fransızca Lüks Mikro-Dokunuş */}
        <Text style={styles.frenchNote}>« {frenchNote} »</Text>

        {/* Başlık (Playfair Display) */}
        <Text style={styles.title}>{title}</Text>

        {/* Açıklama Metni */}
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.divider} />

        {/* Aksiyon Butonları */}
        <View style={styles.buttonGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Atölyeye Dön"
            onPress={onGoHome}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[home.ctaFrom, home.ctaTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <HomeIcon size={18} color={home.accentGold} />
              <Text style={styles.primaryButtonText}>Atölyeye Dön</Text>
            </LinearGradient>
          </Pressable>

          {onRetry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Yeniden Dene"
              onPress={onRetry}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Yeniden Dene</Text>
            </Pressable>
          )}
        </View>

        {/* Marka İmzası */}
        <View style={styles.footer}>
          <Text style={styles.brandTitle}>LUMIÈRE SUCRÉE</Text>
          <Text style={styles.brandSub}>HAUTE PÂTISSERIE VIRTUELLE</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    position: 'relative',
    shadowColor: '#8A5A1C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  iconInnerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: home.ink,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: home.accentGold,
  },
  codeBadgeText: {
    color: home.accentGold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  frenchNote: {
    fontSize: 12,
    color: home.gold,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: home.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: home.muted,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: home.divider,
    marginVertical: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2E1A0D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.3)',
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#FFFDF9',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
  secondaryButtonText: {
    color: home.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    marginTop: 36,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: home.muted,
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 9,
    color: home.muted,
    letterSpacing: 1.5,
    marginTop: 2,
    opacity: 0.7,
  },
});
