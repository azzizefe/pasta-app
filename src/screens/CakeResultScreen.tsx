import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BookmarkIcon,
  ChefHatIcon,
  ChevronLeftIcon,
  CloseIcon,
  CoinsIcon,
  DocumentIcon,
  DownloadIcon,
  HeartIcon,
  ShareIcon,
  SparkleIcon,
} from '../components/Icons';
import CakeImage from '../components/CakeImage';
import DiyRecipeCard from '../components/DiyRecipeCard';
import GeneratingLoader from '../components/GeneratingLoader';
import PastryOrderSheetModal from '../components/PastryOrderSheetModal';
import { Reveal, ShineSweep } from '../components/motion';
import SmartReviewModal from '../components/SmartReviewModal';
import { isGeminiConfigured } from '../config/env';
import { getGenerationCost, useCredits } from '../context/CreditsContext';
import { useSavedCakes } from '../context/SavedCakesContext';
import { trackCreditConsumption } from '../services/analyticsService';
import { generateCakeImage } from '../services/geminiImageService';
import { generateCakeRecipe } from '../services/geminiRecipeService';
import { saveCakeImageToDevice } from '../services/imageSaveService';
import { registerPositiveAction } from '../services/reviewService';
import { resolveAssetUri } from '../utils/assetHelper';
import { CakeDetails, CakeKind, ImageQuality } from '../types/savedCake';
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
  quality?: ImageQuality;
  details?: CakeDetails;
  referenceImageBase64?: string;
  referenceImageUri?: string;
  onBack: () => void;
};

export default function CakeResultScreen({
  title,
  prompt,
  kind = 'custom',
  quality = 'standard',
  details,
  referenceImageBase64,
  referenceImageUri,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const cost = getGenerationCost(quality, kind);
  const {
    credits,
    deductCredits,
    addCredits,
    hasEnoughCredits,
    openPurchaseModal,
  } = useCredits();
  const { saveCake, updateCake, toggleFavorite } = useSavedCakes();

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
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);

  // Gemini 3.1 Flash Lite Özel Ev Yapımı Pasta Tarifi Durumu (Kendi Pastanı Oluştur için)
  const [recipeText, setRecipeText] = useState<string | null>(details?.recipe || null);
  const [isRecipeLoading, setIsRecipeLoading] = useState<boolean>(kind === 'diy' && !details?.recipe);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  const savedCakeIdRef = useRef<string | null>(null);
  const recipeTextRef = useRef<string | null>(details?.recipe || null);

  const fetchRecipe = useCallback(
    async (promptOverride?: string) => {
      if (kind !== 'diy') return;
      setIsRecipeLoading(true);
      setRecipeError(null);
      const targetPrompt = promptOverride || currentPrompt;

      const res = await generateCakeRecipe(targetPrompt, details);
      setIsRecipeLoading(false);
      if (res.success && res.recipe) {
        recipeTextRef.current = res.recipe;
        setRecipeText(res.recipe);
        const targetId = savedCakeIdRef.current || savedCakeId;
        if (targetId) {
          updateCake(targetId, {
            recipe: res.recipe,
            details: {
              ...details,
              recipe: res.recipe,
            },
          });
        }
      } else {
        setRecipeError(res.error || 'Tarif oluşturulamadı.');
      }
    },
    [kind, currentPrompt, details, savedCakeId, updateCake]
  );

  const fetchImage = useCallback(
    async (promptOverride?: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      const targetPrompt = promptOverride || currentPrompt;

      // Kredi kontrolü: seçilen kaliteye göre (Standart / 4K)
      if (!hasEnoughCredits(cost)) {
        setIsLoading(false);
        setErrorMessage('INSUFFICIENT_CREDITS');
        return;
      }

      if (!isGeminiConfigured()) {
        setIsLoading(false);
        setErrorMessage('KEY_MISSING');
        return;
      }

      // Kredi tahsil edilir; tahsil edilemezse (bakiye 0 / yetersiz / geçersiz tutar) görsel üretilmez.
      if (!deductCredits(cost)) {
        setIsLoading(false);
        setErrorMessage('INSUFFICIENT_CREDITS');
        return;
      }
      trackCreditConsumption(
        cost,
        `Görsel Üretimi (${title}${quality === '4k' ? ', 4K' : ''})`,
        Math.max(0, credits - cost)
      );

      const result = await generateCakeImage(targetPrompt, referenceImageBase64, quality);
      setIsLoading(false);

      if (result.success && result.imageUri) {
        setImageUri(result.imageUri);
        setIsSamplePreview(false);
        if (promptOverride) {
          setCurrentPrompt(promptOverride);
        }
        // Başarılı üretimi otomatik olarak koleksiyona kaydet
        try {
          const finalRecipe = recipeTextRef.current || recipeText || details?.recipe;
          const saved = await saveCake({
            title,
            prompt: targetPrompt,
            imageUri: result.imageUri,
            kind,
            recipe: finalRecipe,
            details: {
              ...details,
              referenceImageUri,
              referenceImageBase64,
              recipe: finalRecipe,
            },
            isFavorite: false,
          });
          savedCakeIdRef.current = saved.id;
          setSavedCakeId(saved.id);

          // Eğer tarif daha önce hazırlandıysa ama kayıtta henüz yoksa senkronize et
          if (recipeTextRef.current && !saved.recipe) {
            updateCake(saved.id, {
              recipe: recipeTextRef.current,
              details: {
                ...details,
                recipe: recipeTextRef.current,
              },
            });
          }
        } catch (err) {
          console.warn('Otomatik kayıt hatası:', err);
        }
      } else {
        // Sıfır Risk Garantisi (Zero-Risk Guarantee): Teknik hatada kredi otomatik iade edilir
        addCredits(cost);
        const reason = result.error || 'Görsel oluşturulamadı.';
        setErrorMessage(
          `${reason}\n(Harcanan ${cost} kredi bakiyenize otomatik olarak iade edildi.)`
        );
      }
    },
    [hasEnoughCredits, deductCredits, addCredits, credits, cost, quality, currentPrompt, referenceImageBase64, referenceImageUri, title, kind, details, recipeText, saveCake, updateCake]
  );

  const handleApplyEdit = useCallback(() => {
    if (!editNotes.trim()) return;
    const newPrompt = `${currentPrompt}\n\n[DÜZENLEME TALİMATI]: Fotoğrafta şu detayları güncelle ve değiştir: ${editNotes.trim()}`;
    setIsEditOpen(false);
    setEditNotes('');
    fetchImage(newPrompt);
    if (kind === 'diy') {
      fetchRecipe(newPrompt);
    }
  }, [editNotes, currentPrompt, fetchImage, kind, fetchRecipe]);

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
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: `${title} - Lumière Sucrée`,
            text: `Özel tasarım ${title}: ${currentPrompt.slice(0, 100)}...`,
            url: window.location.href,
          });
          setFeedbackMessage('Paylaşıldı! 🌟');
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(
            `Lumière Sucrée ile tasarladığım ${title}!\n${currentPrompt.slice(0, 120)}`
          );
          setFeedbackMessage('Pasta tarifi ve bilgisi panoya kopyalandı! 📋');
        } else {
          const result = await saveCakeImageToDevice(uriToShare, title);
          setFeedbackMessage(result.message);
        }
      } else {
        const Sharing = require('expo-sharing');
        const FileSystem = require('expo-file-system/legacy');
        let fileToShare = uriToShare;

        if (uriToShare.startsWith('data:image/')) {
          const filename = `lumiere-share-${Date.now()}.jpg`;
          const cachePath = `${FileSystem.cacheDirectory}${filename}`;
          const base64Data = uriToShare.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
          await FileSystem.writeAsStringAsync(cachePath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          fileToShare = cachePath;
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileToShare, {
            mimeType: 'image/jpeg',
            dialogTitle: `${title} Paylaş`,
          });
          setFeedbackMessage('Paylaşım penceresi açıldı.');
        } else {
          const result = await saveCakeImageToDevice(uriToShare, title);
          setFeedbackMessage(result.message);
        }
      }
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setFeedbackMessage('Paylaşım tamamlanamadı.');
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } finally {
      setIsDownloading(false);
    }
  }, [imageUri, title, currentPrompt]);

  // Share directly to Instagram or WhatsApp
  const handleShareToApp = useCallback(async (app: 'instagram' | 'whatsapp') => {
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
    const message = `Lumière Sucrée ile tasarladığım ${title}! ${currentPrompt.slice(0, 120)}`;
    try {
      if (app === 'whatsapp') {
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        await Linking.openURL(url);
      } else {
        const url = `instagram://app`;
        await Linking.openURL(url);
      }
    } catch (err) {
      setFeedbackMessage(`${app === 'whatsapp' ? 'WhatsApp' : 'Instagram'} paylaşımı açılamadı.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  }, [imageUri, title, currentPrompt]);

  

  

  const handleToggleSave = useCallback(async () => {
    if (savedCakeId) {
      toggleFavorite(savedCakeId);
      const nextFav = !isFavorite;
      setIsFavorite(nextFav);
      setFeedbackMessage(nextFav ? 'Tasarım favorilere eklendi! ❤️' : 'Favorilerden çıkarıldı.');
      setTimeout(() => setFeedbackMessage(null), 3000);
      if (nextFav) {
        registerPositiveAction().then((shouldPrompt) => {
          if (shouldPrompt) {
            setTimeout(() => {
              setShowReviewModal(true);
            }, 800);
          }
        });
      }
    } else if (imageUri) {
      try {
        const saved = await saveCake({
          title,
          prompt: currentPrompt,
          imageUri,
          kind,
          recipe: recipeText || details?.recipe,
          details: {
            ...details,
            referenceImageUri,
            referenceImageBase64,
            recipe: recipeText || details?.recipe,
          },
          isFavorite: true,
        });
        setSavedCakeId(saved.id);
        setIsFavorite(true);
        setFeedbackMessage('Tasarım koleksiyonunuza kaydedildi! ✨');
        setTimeout(() => setFeedbackMessage(null), 3000);
      } catch (err) {
        console.warn('Kaydetme hatası:', err);
      }
    }
  }, [savedCakeId, isFavorite, toggleFavorite, imageUri, title, currentPrompt, kind, details, referenceImageUri, referenceImageBase64, recipeText, saveCake]);

  // fetchImage changes identity whenever credits change, so without this guard
  // every deduction would immediately trigger (and bill) another generation.
  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    fetchImage();
    if (kind === 'diy' && !details?.recipe) {
      fetchRecipe();
    }
  }, [fetchImage, fetchRecipe, kind, details?.recipe]);

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

        <View style={styles.headerSpacer} />
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
                <Text style={styles.costBadgeText}>{cost} Kredi Kullanılıyor</Text>
              </View>
            </GeneratingLoader>
          ) : imageUri ? (
            <View style={styles.imageContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fotoğrafı Büyüt"
                onPress={() => setIsZoomModalOpen(true)}
                style={styles.generatedImagePressable}
              >
                <Reveal key={imageUri} style={styles.generatedImage}>
                  <CakeImage
                    source={{ uri: imageUri }}
                    style={styles.generatedImage}
                    contentFit="cover"
                    priority="high"
                    showShimmer
                  />
                </Reveal>
              </Pressable>
              <View style={styles.floatingActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Görseli İndir"
                  onPress={handleDownload}
                  disabled={isDownloading}
                  hitSlop={6}
                  style={styles.floatingActionButton}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFFDF9" />
                  ) : (
                    <>
                      <DownloadIcon size={13} color="#FFFDF9" />
                      <Text style={styles.floatingActionText}>İndir</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Görseli Paylaş"
                  onPress={handleShare}
                  disabled={isDownloading}
                  hitSlop={6}
                  style={styles.floatingActionButton}
                >
                  <ShareIcon size={13} color="#FFFDF9" />
                  <Text style={styles.floatingActionText}>Paylaş</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Instagram Paylaş"
                  onPress={() => handleShareToApp('instagram')}
                  disabled={isDownloading}
                  hitSlop={6}
                  style={styles.floatingActionButton}
                >
                  <ShareIcon size={13} color="#FFFDF9" />
                  <Text style={styles.floatingActionText}>IG</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="WhatsApp Paylaş"
                  onPress={() => handleShareToApp('whatsapp')}
                  disabled={isDownloading}
                  hitSlop={6}
                  style={styles.floatingActionButton}
                >
                  <ShareIcon size={13} color="#FFFDF9" />
                  <Text style={styles.floatingActionText}>WA</Text>
                </Pressable>


                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? 'Kaydedildi' : 'Kaydet'}
                  onPress={handleToggleSave}
                  hitSlop={6}
                  style={[
                    styles.floatingActionButton,
                    isFavorite && styles.floatingActionButtonActive,
                  ]}
                >
                  <HeartIcon
                    size={13}
                    color={isFavorite ? '#E53935' : '#FFFDF9'}
                    filled={isFavorite}
                  />
                  <Text style={styles.floatingActionText}>
                    {isFavorite ? 'Kaydedildi' : 'Kaydet'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : errorMessage === 'INSUFFICIENT_CREDITS' ? (
            <View style={styles.stateContainer}>
              <View style={styles.frameIconRing}>
                <CoinsIcon size={26} color={home.accentGold} />
              </View>
              <Text style={styles.frameTitle}>Yetersiz Kredi</Text>
              <Text style={styles.frameSubtitle}>
                Pasta fotoğrafı oluşturmak için {cost} kredi gereklidir.{'\n'}
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
                <Text style={styles.retryButtonLabel}>Tekrar Dene ({cost} Kredi)</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Kredi Bilgisi & Butonlar */}
        {!isLoading && (
          <>

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

            {kind === 'diy' ? (
              <DiyRecipeCard
                recipe={recipeText}
                isLoading={isRecipeLoading}
                error={recipeError}
                onRetry={() => fetchRecipe()}
                cakeTitle={title}
              />
            ) : (
              <>
                <Text style={styles.sectionLabel}>OLUŞTURULAN TARİF</Text>
                <View style={styles.promptCard}>
                  <Text style={styles.promptText} selectable>
                    {currentPrompt}
                  </Text>
                </View>
              </>
            )}


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
                <Text style={styles.actionButtonLabel}>Farklı Bir Görsel Üret ({cost} Kredi)</Text>
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
                    Düzenlemeleri Uygula ({cost} Kredi)
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

      {/* Pastacı Sipariş Fişi & AI Tarif Rehberi Modalı */}
      <PastryOrderSheetModal
        visible={isOrderSheetOpen}
        onClose={() => setIsOrderSheetOpen(false)}
        title={title}
        kind={kind}
        prompt={currentPrompt}
        imageUri={imageUri}
        details={details}
      />

      {/* Tam Ekran Büyütülmüş Fotoğraf Modalı (Lightbox) */}
      <Modal
        visible={isZoomModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsZoomModalOpen(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <StatusBar style="light" />

          {/* Sol Üst Çarpı Kapatma Butonu */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            onPress={() => setIsZoomModalOpen(false)}
            hitSlop={14}
            style={[styles.lightboxCloseBtn, { top: Math.max(insets.top, 16) + 6 }]}
          >
            <CloseIcon size={20} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          {/* Büyütülmüş Görsel */}
          <Pressable
            style={styles.lightboxImageWrapper}
            onPress={() => setIsZoomModalOpen(false)}
          >
            {imageUri && (
              <CakeImage
                source={{ uri: imageUri }}
                style={styles.lightboxImage}
                contentFit="contain"
                priority="high"
                showShimmer={false}
              />
            )}
          </Pressable>
        </View>
      </Modal>
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
  headerSpacer: {
    width: 40,
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
  generatedImagePressable: {
    width: '100%',
    height: '100%',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 6, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    left: 18,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  lightboxImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 36,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  floatingActionRow: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  floatingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(38, 24, 14, 0.82)',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingActionButtonActive: {
    backgroundColor: 'rgba(56, 32, 18, 0.92)',
    borderColor: 'rgba(243, 217, 166, 0.75)',
  },
  floatingActionText: {
    color: '#FFFDF9',
    fontSize: 12,
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
  orderSpecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 154, 75, 0.45)',
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  orderSpecButtonPressed: {
    opacity: 0.88,
  },
  orderSpecIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: home.ctaFrom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSpecTextGroup: {
    flex: 1,
    gap: 2,
  },
  orderSpecTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
  orderSpecSub: {
    fontSize: 11.5,
    color: home.muted,
    lineHeight: 15,
  },
});

