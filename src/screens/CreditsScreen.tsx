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
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AppleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
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
  getOfferPackage,
  purchaseIAPPackage,
  restoreIAPPurchases,
} from '../services/iapService';
import { trackPaywallImpression, trackPurchaseSuccess } from '../services/analyticsService';
import { fonts, home } from '../theme/theme';
import { PRIVACY_URL, TERMS_URL } from '../config/app';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

// One-time rescue offer: shown the first time the balance runs low, for 30
// minutes. Once it expires or is bought, it never comes back.
const RESCUE_OFFER_KEY = '@lumiere_rescue_offer_v2';
const RESCUE_OFFER_SECONDS = 30 * 60;

type RescueOfferRecord = { expiresAt: number; used?: boolean };

// Separate store product (lumiere_credits_offer_200). The shown price always comes from the store;
// these values are only a development fallback when no store is connected.
const RESCUE_PACKAGE: IAPPackage = {
  id: 'lumiere_credits_offer_200',
  credits: 200,
  priceValue: 14.99,
  currencyCode: 'USD',
  priceTRY: '₺499,99',
  priceUSD: '$14.99',
  priceEUR: '€14.99',
  priceSAR: '59.99 SAR',
  title: 'Size Özel Başlangıç Paketi',
  popular: true,
};

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(m)}:${pad(s)}`;
}

type Props = {
  onClose: () => void;
};

export default function CreditsScreen({ onClose }: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const { credits, addCredits } = useCredits();
  const displayedCredits = useCountUp(credits);
  const isLowBalance = credits < 15;
  // In-App Purchases (RevenueCat / StoreKit / Google Play) State'leri
  const [packagesList, setPackagesList] = useState<IAPPackage[]>(IAP_PACKAGES);
  const [purchasingPkgId, setPurchasingPkgId] = useState<string | null>(null);
  const purchaseInFlightRef = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [iapSuccessMessage, setIapSuccessMessage] = useState<string | null>(null);

  // Tek seferlik teklif: ilk kez kredi azaldığında 30 dk başlar, bir daha sıfırlanmaz.
  const [offer, setOffer] = useState<RescueOfferRecord | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RESCUE_OFFER_KEY);
        let record: RescueOfferRecord | null = raw ? JSON.parse(raw) : null;
        if (!record && isLowBalance) {
          record = { expiresAt: Date.now() + RESCUE_OFFER_SECONDS * 1000 };
          await AsyncStorage.setItem(RESCUE_OFFER_KEY, JSON.stringify(record));
        }
        if (!cancelled && record) {
          setOffer(record);
          setNowMs(Date.now());
        }
      } catch (err) {
        console.warn('Teklif sayacı hatası:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLowBalance]);

  const offerSecondsLeft = offer
    ? Math.max(0, Math.ceil((offer.expiresAt - nowMs) / 1000))
    : 0;
  // The offer only appears when the store actually sells the discounted product.
  const [rescuePkg, setRescuePkg] = useState<IAPPackage | null>(null);
  useEffect(() => {
    let cancelled = false;
    getOfferPackage(RESCUE_PACKAGE)
      .then((pkg) => {
        if (!cancelled) setRescuePkg(pkg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const isOfferActive =
    !!rescuePkg && isLowBalance && !!offer && !offer.used && offerSecondsLeft > 0;
  // "Was" price = the regular 200-credit package's real store price, never a made-up number.
  const regular200 = packagesList.find((p) => p.id === 'lumiere_credits_starter_200');
  const rescueSavingsPct =
    rescuePkg && regular200 && regular200.priceValue > rescuePkg.priceValue && regular200.currencyCode === rescuePkg.currencyCode
      ? Math.floor((1 - rescuePkg.priceValue / regular200.priceValue) * 100)
      : 0;

  useEffect(() => {
    if (!isOfferActive) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOfferActive]);

  const markOfferUsed = () => {
    if (!offer) return;
    const record = { ...offer, used: true };
    setOffer(record);
    AsyncStorage.setItem(RESCUE_OFFER_KEY, JSON.stringify(record)).catch(() => {});
  };

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
    Linking.openURL(TERMS_URL).catch((err) => console.warn('Could not open EULA:', err));
  };

  const handleOpenPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch((err) => console.warn('Could not open Privacy:', err));
  };

  const handlePurchase = async (pkg: IAPPackage, isRescueOffer = false) => {
    // A ref, not state: a double tap fires twice before React re-renders.
    if (purchaseInFlightRef.current) return;
    purchaseInFlightRef.current = true;
    setPurchasingPkgId(isRescueOffer ? 'rescue_offer' : pkg.id);
    try {
      const result = await purchaseIAPPackage(pkg);
      if (result.success) {
        if (isRescueOffer) markOfferUsed();
        addCredits(pkg.credits);
        trackPurchaseSuccess(
          pkg.id,
          pkg.credits,
          currency === 'TRY' ? pkg.priceTRY : pkg.priceUSD,
          Platform.OS === 'ios' ? 'apple_iap' : 'google_play'
        );
        setIapSuccessMessage(tx("🎉 {credits} Kredi hesabınıza başarıyla eklendi!", { credits: pkg.credits }));
        setTimeout(() => setIapSuccessMessage(null), 4000);
      } else if (!result.userCancelled && result.error) {
        showAlert(tx("Satın Alma Başarısız"), result.error);
      }
    } catch (err: any) {
      showAlert(tx("Hata"), err?.message || tx("Ödeme tamamlanamadı."));
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
          accessibilityLabel={tx("Geri")}
          onPress={onClose}
          hitSlop={10}
          style={styles.headerButton}
        >
          <ChevronLeftIcon size={20} color={home.ink} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>{tx("Kredilerim")}</Text>

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

          <Text style={styles.balanceHeroLabel}>{tx("Mevcut Bakiyem")}</Text>
          <View style={styles.balanceHeroCountRow}>
            <Text style={styles.balanceHeroCount}>{displayedCredits}</Text>
            <Text style={styles.balanceHeroUnit}>{tx("Kredi")}</Text>
          </View>

          <Text style={styles.balanceHeroCakes}>{tx("≈ {p0} Adet Stüdyo Kalitesinde Pasta Fotoğrafı", { p0: Math.floor(credits / CREDITS_PER_GENERATION) })}</Text>
        </FadeInUp>

        {/* Tek seferlik kurtarma teklifi: ayrı mağaza ürünü, fiyat mağazadan gelir (30 dk) */}
        {isOfferActive && (
          <FadeInUp distance={12} style={styles.rescueWrap}>
            <LinearGradient
              colors={['#FFFDF8', '#FBF1DC', '#F5E2C3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rescueCard}
            >
              {/* Üst satır: rozet + geri sayım */}
              <View style={styles.rescueTopRow}>
                <View style={styles.rescueBadge}>
                  <SparkleIcon size={11} color="#8A5A1C" />
                  <Text style={styles.rescueBadgeText}>{tx("TEK SEFERLİK TEKLİF")}</Text>
                </View>
                <View
                  style={styles.rescueTimer}
                  accessibilityLabel={tx("Kalan süre {p0} dakika", { p0: Math.floor(offerSecondsLeft / 60) })}
                >
                  <ClockIcon size={13} color="#F5E6CC" strokeWidth={2} />
                  <Text style={styles.rescueTimerText}>{formatCountdown(offerSecondsLeft)}</Text>
                </View>
              </View>

              {/* Orta: paket bilgisi + fiyat */}
              <View style={styles.rescueMainRow}>
                <View style={styles.rescueInfo}>
                  <Text style={styles.rescueEyebrow}>{tx("VIP BAŞLANGIÇ PAKETİ")}</Text>
                  <View style={styles.rescueCreditsRow}>
                    <Text style={styles.rescueCredits}>200</Text>
                    <Text style={styles.rescueCreditsUnit}>{tx("Kredi")}</Text>
                  </View>
                  <Text style={styles.rescueMeta}>{tx("≈ {p0} pasta tasarımı", { p0: Math.floor(200 / CREDITS_PER_GENERATION) })}</Text>
                </View>

                <View style={styles.rescuePriceCol}>
                  {rescueSavingsPct > 0 && regular200 && (
                    <View style={styles.rescueOldRow}>
                      <View style={styles.rescueDiscountPill}>
                        <Text style={styles.rescueDiscountText}>-%{rescueSavingsPct}</Text>
                      </View>
                      <Text style={styles.rescueOldPrice}>{regular200.priceUSD}</Text>
                    </View>
                  )}
                  <Text style={styles.rescueNewPrice}>{rescuePkg?.priceUSD}</Text>
                </View>
              </View>

              {/* Kalan süre çubuğu */}
              <View style={styles.rescueProgressTrack}>
                <View
                  style={[
                    styles.rescueProgressFill,
                    { width: `${(offerSecondsLeft / RESCUE_OFFER_SECONDS) * 100}%` },
                  ]}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Tek seferlik teklif: 200 Kredi {p0}", { p0: rescuePkg?.priceUSD ?? '' })}
                disabled={purchasingPkgId !== null}
                onPress={() => rescuePkg && handlePurchase(rescuePkg, true)}
                style={({ pressed }) => [styles.rescueCta, pressed && styles.rescueCtaPressed]}
              >
                <LinearGradient
                  colors={['#3B2416', '#1E1108']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.rescueCtaInner}
                >
                  <ShineSweep initialDelay={600} interval={3200} />
                  {purchasingPkgId === 'rescue_offer' ? (
                    <ActivityIndicator size="small" color="#FDF6E9" />
                  ) : (
                    <>
                      <LockIcon size={14} color="#F5E6CC" />
                      <Text style={styles.rescueCtaText} numberOfLines={1}>{tx("200 Kredi Al · {priceUSD}", { priceUSD: rescuePkg?.priceUSD })}</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={styles.rescueFootnote}>{tx("Bu fiyat yalnızca bir kez sunulur, süre dolunca kaybolur.")}</Text>
            </LinearGradient>
          </FadeInUp>
        )}

        {/* Paketler Başlığı */}
        <View style={styles.packagesHeaderRow}>
          <Text style={styles.packagesSectionTitle}>{tx("TÜM KREDİ PAKETLERİ")}</Text>
        </View>

        {/* Başarılı IAP Satın Alma Bildirimi */}
        {iapSuccessMessage && (
          <View style={styles.iapSuccessBanner}>
            <CheckIcon size={16} color="#1E5E22" strokeWidth={2.5} />
            <Text style={styles.iapSuccessBannerText}>{iapSuccessMessage}</Text>
          </View>
        )}

        <View style={styles.packagesContainer}>
          {packagesList.map((originalPkg, idx) => {
            const pkg = originalPkg;
            const isBuying = purchasingPkgId === pkg.id;
            const value = getPackageValue(pkg, packagesList);
            return (
              <FadeInUp key={pkg.id} delay={120 + idx * 90}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tx("{credits} Kredi satın al{p1}", { credits: pkg.credits, p1: value.savingsPct > 0 ? tx(", yüzde {savingsPct} tasarruf", { savingsPct: value.savingsPct }) : '' })}
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
                      <Text style={styles.badgeText}>{tx(pkg.badge)}</Text>
                    </View>
                  )}

                  <View style={styles.packageMain}>
                    <View style={styles.packageLeft}>
                      <View style={styles.creditsRow}>
                        <Text style={styles.packageCredits}>{pkg.credits}</Text>
                        <Text style={styles.packageCreditsUnit}>{tx("Kredi")}</Text>
                        {pkg.bonus && (
                          <View style={styles.bonusTag}>
                            <Text style={styles.bonusTagText}>{tx("+{bonus} Hediye", { bonus: pkg.bonus })}</Text>
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
          accessibilityLabel={tx("Satın Alımları Geri Yükle")}
          onPress={async () => {
            setIsRestoring(true);
            try {
              const result = await restoreIAPPurchases();
              if (result.success) {
                showAlert(
                  tx("Satın Alımlar Güncellendi"),
                  tx("Mağaza kayıtlarınız doğrulandı. Mevcut bakiyeniz: {credits} Kredi.", { credits }),
                );
              } else {
                showAlert(tx("Geri Yükleme Hatası"), result.error || tx("Satın alımlar geri yüklenemedi."));
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
            <Text style={styles.restoreButtonText}>{tx("Satın Alımları Geri Yükle (Restore Purchases)")}</Text>
          )}
        </Pressable>

        {/* Apple / Google Yasal Uyum Metni ve EULA Linkleri */}
        <View style={styles.iapLegalContainer}>
          <Text style={styles.iapLegalNotice}>{tx("Ödemeler {p0} üzerinden tahsil edilir. Tüketilebilir krediler kullanıldıkça bakiyeden düşülür.", { p0: Platform.OS === 'ios' ? tx("Apple Kimliğiniz") : tx("Google Hesabınız") })}</Text>
          <View style={styles.iapLegalLinksRow}>
            <Pressable onPress={handleOpenEULA} hitSlop={6}>
              <Text style={styles.iapLegalLink}>{tx("Kullanım Koşulları (EULA)")}</Text>
            </Pressable>
            <Text style={styles.iapLegalDot}>•</Text>
            <Pressable onPress={handleOpenPrivacy} hitSlop={6}>
              <Text style={styles.iapLegalLink}>{tx("Gizlilik Politikası")}</Text>
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
  // Tek seferlik teklif kartı
  rescueWrap: {
    marginBottom: 24,
  },
  rescueCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9CF9E',
    padding: 18,
    shadowColor: '#8A5A1C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  rescueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rescueBadge: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: '#E9CF9E',
  },
  rescueBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A5A1C',
  },
  rescueTimer: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: '#2A170C',
  },
  rescueTimerText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#FFFDF9',
    fontVariant: ['tabular-nums'],
  },
  rescueMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  rescueInfo: {
    flex: 1,
    paddingRight: 12,
  },
  rescueEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: home.muted,
  },
  rescueCreditsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  rescueCredits: {
    fontFamily: fonts.displayMedium,
    fontSize: 34,
    lineHeight: 40,
    color: home.ink,
  },
  rescueCreditsUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: home.ink,
  },
  rescueMeta: {
    fontSize: 12.5,
    fontWeight: '500',
    color: home.muted,
  },
  rescuePriceCol: {
    alignItems: 'flex-end',
  },
  rescueOldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rescueDiscountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E6F2E3',
  },
  rescueDiscountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D5A27',
  },
  rescueOldPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: home.muted,
    textDecorationLine: 'line-through',
  },
  rescueNewPrice: {
    marginTop: 2,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: home.ink,
    fontVariant: ['tabular-nums'],
  },
  rescueProgressTrack: {
    height: 4,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(138, 90, 28, 0.15)',
    overflow: 'hidden',
  },
  rescueProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#B8862F',
  },
  rescueCta: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  rescueCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  rescueCtaInner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  rescueCtaText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFDF9',
  },
  rescueFootnote: {
    marginTop: 10,
    fontSize: 11.5,
    textAlign: 'center',
    color: home.muted,
  },
});
