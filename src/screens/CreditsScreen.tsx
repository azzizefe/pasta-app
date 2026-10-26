import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppleIcon,
  CheckIcon,
  ChevronLeftIcon,
  CoinsIcon,
  LockIcon,
  SparkleIcon,
} from '../components/Icons';
import { formatMoney, getPackageValue } from '../utils/packageValue';
import { FadeInUp, ShineSweep, useCountUp } from '../components/motion';
import { CREDITS_PER_GENERATION, useCredits } from '../context/CreditsContext';
import { IAP_PACKAGES, IAPPackage } from '../types/iap';
import {
  getIAPPackages,
  purchaseIAPPackage,
  restoreIAPPurchases,
} from '../services/iapService';
import { trackPaywallImpression, trackPurchaseSuccess } from '../services/analyticsService';
import { fonts, home } from '../theme/theme';

type Props = {
  onClose: () => void;
};

export default function CreditsScreen({ onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { credits, addCredits } = useCredits();
  const displayedCredits = useCountUp(credits);

  // In-App Purchases (RevenueCat / StoreKit / Google Play) State'leri
  const [packagesList, setPackagesList] = useState<IAPPackage[]>(IAP_PACKAGES);
  const [purchasingPkgId, setPurchasingPkgId] = useState<string | null>(null);
  const purchaseInFlightRef = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [iapSuccessMessage, setIapSuccessMessage] = useState<string | null>(null);

  // Mağazadan güncel yerel fiyatları çek ve Paywall görüntülemesini kaydet
  useEffect(() => {
    trackPaywallImpression('CreditsScreen', credits);
    getIAPPackages()
      .then((pkgs) => setPackagesList(pkgs))
      .catch(() => {});
  }, [credits]);

  // Para birimi seçimi
  const [currency] = useState<'TRY' | 'USD'>('USD');

  const handleOpenEULA = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch((err) => {
      console.warn('Could not open EULA:', err);
    });
  };

  const handleOpenPrivacy = () => {
    Linking.openURL('https://lumieresucree.app/privacy').catch(() => {
      Linking.openURL('https://www.apple.com/legal/privacy/').catch((err) => {
        console.warn('Could not open Privacy:', err);
      });
    });
  };

  const handlePurchase = async (pkg: IAPPackage) => {
    // A ref, not state: a double tap fires twice before React re-renders.
    if (purchaseInFlightRef.current) return;
    purchaseInFlightRef.current = true;
    setPurchasingPkgId(pkg.id);
    try {
      const result = await purchaseIAPPackage(pkg);
      if (result.success) {
        addCredits(pkg.credits);
        trackPurchaseSuccess(
          pkg.id,
          pkg.credits,
          currency === 'TRY' ? pkg.priceTRY : pkg.priceUSD,
          Platform.OS === 'ios' ? 'apple_iap' : 'google_play'
        );
        setIapSuccessMessage(`🎉 ${pkg.credits} Kredi hesabınıza başarıyla eklendi!`);
        setTimeout(() => setIapSuccessMessage(null), 4000);
      } else if (!result.userCancelled && result.error) {
        showAlert('Satın Alma Başarısız', result.error);
      }
    } catch (err: any) {
      showAlert('Hata', err?.message || 'Ödeme tamamlanamadı.');
    } finally {
      purchaseInFlightRef.current = false;
      setPurchasingPkgId(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={[home.washTop, home.washMid, home.washEnd]}
        locations={[0, 0.24, 0.58]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={onClose}
          hitSlop={10}
          style={styles.headerButton}
        >
          <ChevronLeftIcon size={20} color={home.ink} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Kredilerim
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Büyük Bakiye Kartı */}
        <FadeInUp style={styles.balanceHeroCard} distance={10}>
          <View style={styles.balanceHeroTop}>
            <View style={styles.balanceHeroIconCircle}>
              <CoinsIcon size={24} color={home.accentGold} />
            </View>
          </View>

          <Text style={styles.balanceHeroLabel}>Mevcut Bakiyem</Text>
          <View style={styles.balanceHeroCountRow}>
            <Text style={styles.balanceHeroCount}>{displayedCredits}</Text>
            <Text style={styles.balanceHeroUnit}> Kredi</Text>
          </View>

          <Text style={styles.balanceHeroCakes}>
            ≈ {Math.floor(credits / CREDITS_PER_GENERATION)} Adet Stüdyo Kalitesinde Pasta Fotoğrafı
          </Text>
        </FadeInUp>

        {/* Paketler Başlığı */}
        <View style={styles.packagesHeaderRow}>
          <Text style={styles.packagesSectionTitle}>KREDİ YÜKLE</Text>
        </View>

        {/* Başarılı IAP Satın Alma Bildirimi */}
        {iapSuccessMessage && (
          <View style={styles.iapSuccessBanner}>
            <CheckIcon size={16} color="#1E5E22" strokeWidth={2.5} />
            <Text style={styles.iapSuccessBannerText}>{iapSuccessMessage}</Text>
          </View>
        )}

        <View style={styles.packagesContainer}>
          {packagesList.map((pkg, idx) => {
            const isBuying = purchasingPkgId === pkg.id;
            const value = getPackageValue(pkg, packagesList);
            return (
              <FadeInUp key={pkg.id} delay={120 + idx * 90}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${pkg.credits} Kredi satın al${value.savingsPct > 0 ? `, yüzde ${value.savingsPct} tasarruf` : ''}`}
                  onPress={() => handlePurchase(pkg)}
                  style={({ pressed }) => [
                    styles.packageCard,
                    pkg.popular && styles.packageCardPopular,
                    pressed && styles.packageCardPressed,
                  ]}
                >
                  {pkg.badge && (
                    <View
                      style={[
                        styles.badge,
                        pkg.popular ? styles.badgePopular : styles.badgeNormal,
                      ]}
                    >
                      <Text style={styles.badgeText}>{pkg.badge}</Text>
                    </View>
                  )}

                  <View style={styles.packageMain}>
                    <View style={styles.packageLeft}>
                      <View style={styles.creditsRow}>
                        <Text style={styles.packageCredits}>{pkg.credits}</Text>
                        <Text style={styles.packageCreditsUnit}> Kredi</Text>
                        {pkg.bonus && (
                          <View style={styles.bonusTag}>
                            <Text style={styles.bonusTagText}>+{pkg.bonus} Hediye</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.packageRight}>
                      {value.savingsPct > 0 && (
                        <Text style={styles.referencePrice}>
                          {formatMoney(value.referencePrice, pkg.currencyCode)}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.priceButton,
                          pkg.popular && styles.priceButtonPopular,
                        ]}
                      >
                        {pkg.popular && <ShineSweep initialDelay={900} interval={3000} />}
                        {isBuying ? (
                          <ActivityIndicator size="small" color={pkg.popular ? '#FDF6E9' : home.ink} />
                        ) : (
                          <>
                            <LockIcon size={12} color={pkg.popular ? '#FDF6E9' : home.ink} />
                            <Text
                              style={[
                                styles.priceText,
                                pkg.popular && styles.priceTextPopular,
                              ]}
                            >
                              {currency === 'TRY' ? pkg.priceTRY : pkg.priceUSD}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>


                </Pressable>
              </FadeInUp>
            );
          })}
        </View>

        {/* Apple App Store Zorunlu Butonu: Satın Alımları Geri Yükle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Satın Alımları Geri Yükle"
          onPress={async () => {
            setIsRestoring(true);
            try {
              const result = await restoreIAPPurchases();
              if (result.success) {
                showAlert(
                  'Satın Alımlar Güncellendi',
                  `Mağaza kayıtlarınız doğrulandı. Mevcut bakiyeniz: ${credits} Kredi.`,
                );
              } else {
                showAlert('Geri Yükleme Hatası', result.error || 'Satın alımlar geri yüklenemedi.');
              }
            } finally {
              setIsRestoring(false);
            }
          }}
          style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={home.muted} />
          ) : (
            <Text style={styles.restoreButtonText}>
              Satın Alımları Geri Yükle (Restore Purchases)
            </Text>
          )}
        </Pressable>

        {/* Apple / Google Yasal Uyum Metni ve EULA Linkleri */}
        <View style={styles.iapLegalContainer}>
          <Text style={styles.iapLegalNotice}>
            Ödemeler {Platform.OS === 'ios' ? 'Apple Kimliğiniz' : 'Google Hesabınız'} üzerinden tahsil edilir. Tüketilebilir krediler kullanıldıkça bakiyeden düşülür.
          </Text>
          <View style={styles.iapLegalLinksRow}>
            <Pressable onPress={handleOpenEULA} hitSlop={6}>
              <Text style={styles.iapLegalLink}>Kullanım Koşulları (EULA)</Text>
            </Pressable>
            <Text style={styles.iapLegalDot}>•</Text>
            <Pressable onPress={handleOpenPrivacy} hitSlop={6}>
              <Text style={styles.iapLegalLink}>Gizlilik Politikası</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 460;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 21,
    color: home.ink,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Kredilerim Hero Kartı
  balanceHeroCard: {
    backgroundColor: home.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: home.cardBorder,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  balanceHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceHeroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceHeroLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: home.muted,
  },
  balanceHeroCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  balanceHeroCount: {
    fontFamily: fonts.displayMedium,
    fontSize: 38,
    fontWeight: '800',
    color: home.ink,
  },
  balanceHeroUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: home.muted,
  },
  balanceHeroCakes: {
    fontSize: 13.5,
    color: home.muted,
    marginTop: 4,
    fontWeight: '500',
  },

  packagesSectionTitle: {
    marginLeft: 4,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: home.muted,
  },
  packagesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  storeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EADB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.muted,
  },
  iapSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  iapSuccessBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E5E22',
    flex: 1,
  },
  packagesContainer: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: home.card,
    borderWidth: 1.5,
    borderColor: home.cardBorder,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: 'relative',
  },
  packageMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  yieldText: {
    fontSize: 12.5,
    color: home.body,
  },
  yieldStrong: {
    fontWeight: '700',
    color: home.ink,
  },
  yield4k: {
    fontWeight: '800',
    color: home.gold,
  },
  yieldMuted: {
    fontSize: 12,
    color: home.muted,
  },
  yieldDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: home.muted,
  },
  referencePrice: {
    alignSelf: 'flex-end',
    marginBottom: 4,
    marginRight: 6,
    fontSize: 12,
    fontWeight: '600',
    color: home.muted,
    textDecorationLine: 'line-through',
  },
  valueStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: home.divider,
  },
  perDesignText: {
    flexShrink: 1,
    fontSize: 12,
    color: home.body,
  },
  perDesignStrong: {
    fontWeight: '700',
    color: home.ink,
  },
  perDesignOld: {
    color: home.muted,
    textDecorationLine: 'line-through',
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#5A3A10',
  },
  savingsTextPopular: {
    color: home.accentGold,
  },
  trialText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: home.muted,
  },
  savingsNote: {
    marginTop: -6,
    marginBottom: 14,
    marginLeft: 4,
    fontSize: 11.5,
    color: home.muted,
  },
  packageCardPopular: {
    borderColor: home.accentGold,
    backgroundColor: '#FFFBF5',
    shadowColor: '#B8862F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  packageCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgePopular: {
    backgroundColor: home.accentGold,
  },
  badgeNormal: {
    backgroundColor: home.ink,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  packageLeft: {
    flex: 1,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packageCredits: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    fontWeight: '700',
    color: home.ink,
  },
  packageCreditsUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
  },
  bonusTag: {
    marginLeft: 8,
    backgroundColor: '#FDEED9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bonusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9C5810',
  },
  packageRight: {
    marginLeft: 12,
  },
  priceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: home.washTop,
    borderWidth: 1,
    borderColor: home.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  priceButtonPopular: {
    backgroundColor: home.ink,
    borderColor: home.ink,
    overflow: 'hidden',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
  },
  priceTextPopular: {
    color: '#FDF6E9',
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  restoreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.muted,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
  iapLegalContainer: {
    marginTop: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  iapLegalNotice: {
    fontSize: 11,
    color: home.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  iapLegalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iapLegalLink: {
    fontSize: 12,
    color: home.ink,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  iapLegalDot: {
    fontSize: 12,
    color: home.muted,
  },
});
