import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BookmarkIcon,
  ChevronLeftIcon,
  CoinsIcon,
  DownloadIcon,
  HeartIcon,
  ShareIcon,
  SparkleIcon,
} from '../components/Icons';
import CakeImage from '../components/CakeImage';
import GeneratingLoader from '../components/GeneratingLoader';
import { Reveal, ShineSweep } from '../components/motion';
import SmartReviewModal from '../components/SmartReviewModal';
import { isGeminiConfigured } from '../config/env';
import { CREDITS_PER_GENERATION, useCredits } from '../context/CreditsContext';
import { useSavedCakes } from '../context/SavedCakesContext';
import { trackCreditConsumption } from '../services/analyticsService';
import { generateCakeImage } from '../services/geminiImageService';
import { saveCakeImageToDevice } from '../services/imageSaveService';
import { registerPositiveAction } from '../services/reviewService';
import { resolveAssetUri } from '../utils/assetHelper';
import { CakeDetails, CakeKind } from '../types/savedCake';
import { fonts, home } from '../theme/theme';

const CONTENT_MAX_WIDTH = 460;

const WEDDING_SAMPLE = require('../../assets/wedding-cake.png');
const BIRTHDAY_SAMPLE = require('../../assets/birthday-cake.png');
const ENGAGEMENT_SAMPLE = require('../../assets/engagement-cake.png');
const CUSTOM_SAMPLE = require('../../assets/custom-cake.png');
const DEFAULT_SAMPLE = require('../../assets/cake.png');

function getCategorySampleAsset(title: string) {
  const t = (title || '').toLowerCase();
  if (t.includes('düğün') || t.includes('wedding')) return WEDDING_SAMPLE;
  if (t.includes('doğum') || t.includes('birthday')) return BIRTHDAY_SAMPLE;
  if (t.includes('nişan') || t.includes('engagement')) return ENGAGEMENT_SAMPLE;
  if (t.includes('özel') || t.includes('custom') || t.includes('kendi')) return CUSTOM_SAMPLE;
  return DEFAULT_SAMPLE;
}

type Props = {
  title: string;
  prompt: string;
  kind?: CakeKind;
  details?: CakeDetails;
  referenceImageBase64?: string;
  referenceImageUri?: string;
  onBack: () => void;
};

export default function CakeResultScreen({
  title,
  prompt,
  kind = 'custom',
  details,
  referenceImageBase64,
  referenceImageUri,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const {
    credits,
    deductCredits,
    addCredits,
    hasEnoughCredits,
    openPurchaseModal,
  } = useCredits();
  const { saveCake, toggleFavorite } = useSavedCakes();

  const [isLoading, setIsLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedCakeId, setSavedCakeId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSamplePreview, setIsSamplePreview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchImage = useCallback(
    async (promptOverride?: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      const targetPrompt = promptOverride || currentPrompt;

      // Kredi kontrolü: 1 pasta = CREDITS_PER_GENERATION kredi
      if (!hasEnoughCredits(CREDITS_PER_GENERATION)) {
        setIsLoading(false);
        setErrorMessage('INSUFFICIENT_CREDITS');
        return;
      }

      if (!isGeminiConfigured()) {
        setIsLoading(false);
        setErrorMessage('KEY_MISSING');
        return;
      }

      // CREDITS_PER_GENERATION kredi tahsil edilir ve tüketim hızı izlenir
      deductCredits(CREDITS_PER_GENERATION);
      trackCreditConsumption(
        CREDITS_PER_GENERATION,
        `Görsel Üretimi (${title})`,
        Math.max(0, credits - CREDITS_PER_GENERATION)
      );

      const result = await generateCakeImage(targetPrompt, referenceImageBase64);
      setIsLoading(false);

      if (result.success && result.imageUri) {
        setImageUri(result.imageUri);
        setIsSamplePreview(false);
        if (promptOverride) {
          setCurrentPrompt(promptOverride);
        }
        // Başarılı üretimi otomatik olarak koleksiyona kaydet
        try {
          const saved = await saveCake({
            title,
            prompt: targetPrompt,
            imageUri: result.imageUri,
            kind,
            details: {
              ...details,
              referenceImageUri,
              referenceImageBase64,
            },
            isFavorite: false,
          });
          setSavedCakeId(saved.id);
        } catch (err) {
          console.warn('Otomatik kayıt hatası:', err);
        }
      } else {
        // Sıfır Risk Garantisi (Zero-Risk Guarantee): Teknik hatada kredi otomatik iade edilir
        addCredits(CREDITS_PER_GENERATION);
        const reason = result.error || 'Görsel oluşturulamadı.';
        setErrorMessage(
          `${reason}\n(Harcanan ${CREDITS_PER_GENERATION} kredi bakiyenize otomatik olarak iade edildi.)`
        );
      }
    },
    [hasEnoughCredits, deductCredits, addCredits, credits, currentPrompt, referenceImageBase64, referenceImageUri, title, kind, details, saveCake]
  );

  const handleApplyEdit = useCallback(() => {
    if (!editNotes.trim()) return;
    const newPrompt = `${currentPrompt}\n\n[DÜZENLEME TALİMATI]: Fotoğrafta şu detayları güncelle ve değiştir: ${editNotes.trim()}`;
    setIsEditOpen(false);
    setEditNotes('');
    fetchImage(newPrompt);
  }, [editNotes, currentPrompt, fetchImage]);

  const handleLoadSamplePreview = useCallback(async () => {
    const sampleAsset = getCategorySampleAsset(title);
    const assetUri = resolveAssetUri(sampleAsset);
    if (assetUri) {
      setImageUri(assetUri);
      setIsSamplePreview(true);
      setErrorMessage(null);
      try {
        const saved = await saveCake({
          title,
          prompt: currentPrompt,
          imageUri: assetUri,
          kind,
          details: {
            ...details,
            referenceImageUri,
            referenceImageBase64,
          },
          isFavorite: false,
        });
        setSavedCakeId(saved.id);
      } catch (err) {
        console.warn('Örnek önizleme kayıt hatası:', err);
      }
    }
  }, [title, currentPrompt, kind, details, referenceImageUri, referenceImageBase64, saveCake]);

  const handleDownload = useCallback(async () => {
    let uriToSave = imageUri;

    // Canlı AI görseli henüz yoksa, ilgili kategorinin örnek tasarımını hazırla ve indir
    if (!uriToSave) {
      const sampleAsset = getCategorySampleAsset(title);
      const assetUri = resolveAssetUri(sampleAsset);
      if (assetUri) {
        uriToSave = assetUri;
        setImageUri(assetUri);
        setIsSamplePreview(true);
      }
    }

    if (!uriToSave) {
      setFeedbackMessage('İndirilecek bir görsel bulunamadı.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }

    setIsDownloading(true);
    try {
      const result = await saveCakeImageToDevice(uriToSave, title);
      setFeedbackMessage(result.message);
      setTimeout(() => setFeedbackMessage(null), 4000);

      // "Aha! Moment" kontrolü: 2. pasta indirme veya favorileme
      registerPositiveAction().then((shouldPrompt) => {
        if (shouldPrompt) {
          setTimeout(() => {
            setShowReviewModal(true);
          }, 1200);
        }
      });
    } catch (err: any) {
      setFeedbackMessage('İndirme hatası: ' + (err?.message || 'Sorun oluştu'));
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  }, [imageUri, title]);

  const handleShare = useCallback(async () => {
    let uriToShare = imageUri;

    if (!uriToShare) {
      const sampleAsset = getCategorySampleAsset(title);
      const assetUri = resolveAssetUri(sampleAsset);
      if (assetUri) {
        uriToShare = assetUri;
        setImageUri(assetUri);
        setIsSamplePreview(true);
      }
    }

    if (!uriToShare) {
      setFeedbackMessage('Paylaşılacak bir görsel bulunamadı.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }

    setIsDownloading(true);
    try {
      const result = await saveCakeImageToDevice(uriToShare, title);
      setFeedbackMessage(result.message);
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage('Paylaşım başlatılamadı: ' + (err?.message || 'Sorun oluştu'));
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setIsDownloading(false);
    }
  }, [imageUri, title]);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={[home.washTop, home.washMid, home.washEnd]}
        locations={[0, 0.24, 0.58]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={onBack}
          hitSlop={10}
          style={styles.backButton}
        >
          <ChevronLeftIcon size={20} color={home.ink} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.headerRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Görseli İndir"
            onPress={handleDownload}
            disabled={isDownloading}
            hitSlop={8}
            style={[styles.headerDownloadBtn, isDownloading && styles.headerDownloadBtnDisabled]}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={home.ink} />
            ) : (
              <DownloadIcon size={18} color={home.ink} />
            )}
          </Pressable>

          {imageUri && savedCakeId && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Favorilere Ekle"
              onPress={() => {
                toggleFavorite(savedCakeId);
                const nextFav = !isFavorite;
                setIsFavorite(nextFav);
                if (nextFav) {
                  registerPositiveAction().then((shouldPrompt) => {
                    if (shouldPrompt) {
                      setTimeout(() => {
                        setShowReviewModal(true);
                      }, 800);
                    }
                  });
                }
              }}
              hitSlop={8}
              style={[
                styles.headerFavoriteBtn,
                isFavorite && styles.headerFavoriteBtnActive,
              ]}
            >
              <HeartIcon
                size={18}
                color={isFavorite ? '#E53935' : home.ink}
                filled={isFavorite}
              />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kredi Bakiyesi"
            onPress={openPurchaseModal}
            style={styles.headerCreditBadge}
          >
            <CoinsIcon size={16} color={home.accentGold} />
            <Text style={styles.headerCreditText}>{credits}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Görsel Çerçevesi */}
        <View style={styles.frame}>
          {isLoading ? (
            <GeneratingLoader>
              <View style={styles.costBadge}>
                <CoinsIcon size={14} color={home.accentGold} />
                <Text style={styles.costBadgeText}>{CREDITS_PER_GENERATION} Kredi Kullanılıyor</Text>
              </View>
            </GeneratingLoader>
          ) : imageUri ? (
            <View style={styles.imageContainer}>
              <Reveal key={imageUri} style={styles.generatedImage}>
                <CakeImage
                  source={{ uri: imageUri }}
                  style={styles.generatedImage}
                  contentFit="cover"
                  priority="high"
                  showShimmer
                />
              </Reveal>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Görseli İndir"
                onPress={handleDownload}
                disabled={isDownloading}
                style={styles.floatingImageDownloadBtn}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFDF9" />
                ) : (
                  <>
                    <DownloadIcon size={14} color="#FFFDF9" />
                    <Text style={styles.floatingImageDownloadText}>İndir</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : errorMessage === 'INSUFFICIENT_CREDITS' ? (
            <View style={styles.stateContainer}>
              <View style={styles.frameIconRing}>
                <CoinsIcon size={26} color={home.accentGold} />
              </View>
              <Text style={styles.frameTitle}>Yetersiz Kredi</Text>
              <Text style={styles.frameSubtitle}>
                Pasta fotoğrafı oluşturmak için {CREDITS_PER_GENERATION} kredi gereklidir.{'\n'}
                Mevcut bakiyen: <Text style={styles.boldText}>{credits} Kredi</Text>.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={openPurchaseModal}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonLabel}>Kredi Yükle</Text>
              </Pressable>
            </View>
          ) : errorMessage === 'KEY_MISSING' ? (
            <View style={styles.stateContainer}>
              <View style={styles.frameIconRing}>
                <SparkleIcon size={22} color={home.accentGold} />
              </View>
              <Text style={styles.frameTitle}>Yapay Zeka Servisi Bekleniyor</Text>
              <Text style={styles.frameSubtitle}>
                .env dosyanıza EXPO_PUBLIC_AI_BACKEND_URL veya EXPO_PUBLIC_GEMINI_API_KEY değerini girdikten sonra
                pasta fotoğrafları otomatik olarak burada üretilecektir.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Örnek Görseli Yükle & İndir"
                onPress={handleLoadSamplePreview}
                style={styles.samplePreviewBtn}
              >
                <SparkleIcon size={15} color="#FFFDF9" />
                <Text style={styles.samplePreviewBtnText}>Örnek Görseli Yükle & İndir</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <View style={styles.frameIconRing}>
                <SparkleIcon size={22} color={home.accentGold} />
              </View>
              <Text style={styles.frameTitle}>Görsel Oluşturulamadı</Text>
              <Text style={styles.frameSubtitle}>{errorMessage}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => fetchImage()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonLabel}>Tekrar Dene ({CREDITS_PER_GENERATION} Kredi)</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Kredi Bilgisi & Butonlar */}
        {!isLoading && (
          <>
            {imageUri && (
              <>
                <View style={styles.savedBanner}>
                  <BookmarkIcon size={16} color={home.accentGold} />
                  <Text style={styles.savedBannerText}>
                    Bu tasarım <Text style={styles.boldText}>Koleksiyonum</Text> sayfasına otomatik olarak kaydedildi.
                  </Text>
                </View>

                <View style={styles.creditInfoPill}>
                  <CoinsIcon size={15} color={home.accentGold} />
                  <Text style={styles.creditInfoText}>
                    {isSamplePreview
                      ? 'Örnek görsel • Kredi kullanılmadı • Bakiyen: '
                      : `${CREDITS_PER_GENERATION} Kredi kullanıldı • Kalan bakiyen: `}
                    <Text style={styles.boldText}>{credits} Kredi</Text>
                  </Text>
                </View>
              </>
            )}

            {referenceImageUri && (
              <View style={styles.referenceCard}>
                <View style={styles.referenceHeader}>
                  <SparkleIcon size={14} color={home.gold} />
                  <Text style={styles.referenceHeaderText}>Yüklenen İlham Fotoğrafı</Text>
                </View>
                <View style={styles.referenceBody}>
                  <CakeImage
                    source={{ uri: referenceImageUri }}
                    style={styles.referenceThumb}
                    contentFit="cover"
                    borderRadius={8}
                    showShimmer={false}
                  />
                  <Text style={styles.referenceDesc}>
                    Yapay zeka bu fotoğraftaki renk paleti ve dekoratif motifleri pastanıza başarıyla entegre etti.
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>OLUŞTURULAN TARİF</Text>
            <View style={styles.promptCard}>
              <Text style={styles.promptText} selectable>
                {currentPrompt}
              </Text>
            </View>

            {/* Görsel İndirme & Paylaşma Aksiyon Grubu */}
            <View style={styles.downloadActionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Görseli İndir"
                onPress={handleDownload}
                disabled={isDownloading}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.25)' }}
                style={({ pressed }) => [
                  styles.downloadPrimaryBtn,
                  pressed && styles.downloadPrimaryBtnPressed,
                  isDownloading && styles.downloadPrimaryBtnDisabled,
                ]}
              >
                <ShineSweep initialDelay={1600} interval={3800} />
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFDF9" />
                ) : (
                  <>
                    <DownloadIcon size={18} color="#FFFDF9" />
                    <Text style={styles.downloadPrimaryBtnText}>Görseli İndir</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Paylaş"
                onPress={handleShare}
                disabled={isDownloading}
                android_ripple={{ color: home.divider }}
                style={({ pressed }) => [
                  styles.shareSecondaryBtn,
                  pressed && styles.shareSecondaryBtnPressed,
                ]}
              >
                <ShareIcon size={18} color={home.ink} />
                <Text style={styles.shareSecondaryBtnText}>Paylaş</Text>
              </Pressable>
            </View>

            {feedbackMessage && (
              <View style={styles.feedbackToast}>
                <SparkleIcon size={15} color={home.accentGold} />
                <Text style={styles.feedbackToastText}>{feedbackMessage}</Text>
              </View>
            )}

            {imageUri && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yeniden Görsel Üret"
                onPress={() => fetchImage()}
                android_ripple={{ color: home.divider }}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Text style={styles.actionButtonLabel}>Farklı Bir Görsel Üret ({CREDITS_PER_GENERATION} Kredi)</Text>
              </Pressable>
            )}

            {!isEditOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Düzenle"
                onPress={() => setIsEditOpen(true)}
                android_ripple={{ color: home.divider }}
                style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}
              >
                <Text style={styles.editButtonLabel}>Düzenle</Text>
              </Pressable>
            ) : (
              <View style={styles.editCard}>
                <View style={styles.editHeaderRow}>
                  <View style={styles.editHeaderLeft}>
                    <SparkleIcon size={16} color={home.accentGold} />
                    <Text style={styles.editHeaderTitle}>FOTOĞRAFTA DÜZENLENECEK DETAYLAR</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setIsEditOpen(false);
                      setEditNotes('');
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.editCancelText}>Vazgeç</Text>
                  </Pressable>
                </View>

                <Text style={styles.editSubtitle}>
                  Bu fotoğrafta değiştirmek, eklemek veya çıkarmak istediğin detayları yaz:
                </Text>

                <TextInput
                  style={styles.editTextInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Örn: Üst kattaki süslemeleri kaldırıp beyaz güller ekle, renk tonunu daha pastel pembe yap..."
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  textAlignVertical="top"
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Düzenlemeyi Uygula"
                  disabled={!editNotes.trim()}
                  onPress={handleApplyEdit}
                  style={({ pressed }) => [
                    styles.applyEditButton,
                    !editNotes.trim() && styles.applyEditButtonDisabled,
                    pressed && styles.applyEditButtonPressed,
                  ]}
                >
                  <SparkleIcon size={16} color="#FFFDF9" />
                  <Text style={styles.applyEditButtonLabel}>
                    Düzenlemeleri Uygula ({CREDITS_PER_GENERATION} Kredi)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onBack}
                  hitSlop={8}
                  style={styles.backToFormBtn}
                >
                  <Text style={styles.backToFormText}>
                    Veya seçim formuna geri dön
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Akıllı İki Aşamalı 5 Yıldız Değerlendirme Modalı */}
      <SmartReviewModal
        visible={showReviewModal}
        cakeTitle={title}
        onClose={() => setShowReviewModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
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
  headerCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    gap: 6,
  },
  headerCreditText: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
  },
  scroll: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  frame: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    overflow: 'hidden',
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
  generatedImage: {
    width: '100%',
    height: '100%',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 14,
    gap: 6,
  },
  costBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  frameIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.ink,
    marginBottom: 14,
  },
  frameTitle: {
    marginTop: 16,
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: home.ink,
    textAlign: 'center',
  },
  frameSubtitle: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: home.muted,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '700',
    color: home.ink,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: home.ink,
  },
  retryButtonLabel: {
    color: '#FDF6E9',
    fontSize: 14,
    fontWeight: '600',
  },
  creditInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  creditInfoText: {
    fontSize: 13,
    color: home.muted,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: home.muted,
  },
  promptCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    padding: 16,
  },
  promptText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: home.ink,
  },
  actionButton: {
    marginTop: 16,
    height: 50,
    borderRadius: 25,
    backgroundColor: home.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FDF6E9',
  },
  editButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonPressed: {
    opacity: 0.85,
  },
  editButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFavoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFavoriteBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 217, 166, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.5)',
  },
  savedBannerText: {
    flex: 1,
    fontSize: 13,
    color: home.ink,
    lineHeight: 18,
  },
  editCard: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 18,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  editHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: home.ink,
  },
  editCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.muted,
  },
  editSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: home.muted,
    marginBottom: 12,
  },
  editTextInput: {
    backgroundColor: 'rgba(247, 243, 237, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: home.ink,
    minHeight: 80,
    marginBottom: 14,
  },
  applyEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  applyEditButtonDisabled: {
    opacity: 0.5,
  },
  applyEditButtonPressed: {
    opacity: 0.85,
  },
  applyEditButtonLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFDF9',
    letterSpacing: 0.2,
  },
  backToFormBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  backToFormText: {
    fontSize: 13,
    color: home.muted,
    textDecorationLine: 'underline',
  },
  referenceCard: {
    backgroundColor: '#FAF3E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFE2CE',
    padding: 14,
    marginBottom: 18,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  referenceHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
  },
  referenceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  referenceThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2D3BE',
  },
  referenceDesc: {
    flex: 1,
    fontSize: 12,
    color: home.muted,
    lineHeight: 16,
  },
  headerDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE6D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDownloadBtnDisabled: {
    opacity: 0.6,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  floatingImageDownloadBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(38, 24, 14, 0.82)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingImageDownloadText: {
    color: '#FFFDF9',
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  samplePreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.4)',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  samplePreviewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  downloadActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  downloadPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
    overflow: 'hidden',
  },
  downloadPrimaryBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  downloadPrimaryBtnDisabled: {
    opacity: 0.6,
  },
  downloadPrimaryBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFDF9',
    letterSpacing: 0.2,
  },
  shareSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#E8DCB8',
  },
  shareSecondaryBtnPressed: {
    backgroundColor: '#F3EADB',
  },
  shareSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
  },
  feedbackToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7EEDF',
    borderWidth: 1,
    borderColor: '#E2CFA5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackToastText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.ink,
  },
});

