import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CakeImage from './CakeImage';
import PinchableImageViewer from './PinchableImageViewer';
import DiyRecipeCard from './DiyRecipeCard';
import PastryOrderSheetModal from './PastryOrderSheetModal';
import {
  CheckIcon,
  ChefHatIcon,
  ChevronLeftIcon,
  CloseIcon,
  CopyIcon,
  DocumentIcon,
  DownloadIcon,
  HeartIcon,
  SparkleIcon,
  TrashIcon,
} from './Icons';
import { saveCakeImageToDevice } from '../services/imageSaveService';
import { generateCakeRecipe } from '../services/geminiRecipeService';
import { useAiConsentGate } from '../hooks/useAiConsentGate';
import { useSavedCakes } from '../context/SavedCakesContext';
import { SavedCake } from '../types/savedCake';
import { fonts, home } from '../theme/theme';
import { getTxLocale, tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

interface Props {
  visible: boolean;
  cake: SavedCake | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onRemix?: (cake: SavedCake) => void;
}

export default function CakeDetailModal({
  visible,
  cake,
  onClose,
  onToggleFavorite,
  onDelete,
  onRemix,
}: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const { updateCake } = useSavedCakes();
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Kendi Pastanı Oluştur için AI Şef Tarifi State'i
  const initialRecipe = cake?.recipe || cake?.details?.recipe || null;
  const [recipeText, setRecipeText] = useState<string | null>(initialRecipe);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const { ensureAiConsent, consentSheet } = useAiConsentGate();

  const handleFetchRecipe = useCallback(async () => {
    if (!cake || cake.kind !== 'diy') return;
    setIsRecipeLoading(true);
    setRecipeError(null);
    try {
      if (!(await ensureAiConsent())) {
        setIsRecipeLoading(false);
        setRecipeError(tx("Tarifi hazırlamak için yapay zeka veri paylaşımına izin vermen gerekiyor."));
        return;
      }
      const res = await generateCakeRecipe(cake.prompt, cake.details);
      setIsRecipeLoading(false);
      if (res.success && res.recipe) {
        setRecipeText(res.recipe);
        updateCake(cake.id, {
          recipe: res.recipe,
          details: {
            ...cake.details,
            recipe: res.recipe,
          },
        });
      } else {
        setRecipeError(res.error || tx("Tarif oluşturulamadı."));
      }
    } catch (err: any) {
      setIsRecipeLoading(false);
      setRecipeError(tx("Tarif hazırlanırken bir hata oluştu."));
    }
  }, [cake, updateCake, ensureAiConsent]);

  useEffect(() => {
    if (!cake) return;
    const existing = cake.recipe || cake.details?.recipe || null;
    setRecipeText(existing);
    setRecipeError(null);

    // Kendi Pastanı Oluştur kategorisindeyse ve henüz tarif yoksa otomatik hazırla
    if (cake.kind === 'diy' && !existing) {
      handleFetchRecipe();
    }
  }, [cake?.id, cake?.kind, cake?.recipe, cake?.details?.recipe, handleFetchRecipe]);

  if (!cake) return null;

  const handleDownload = async () => {
    if (!cake?.imageUri) return;
    setIsDownloading(true);
    try {
      const res = await saveCakeImageToDevice(cake.imageUri, cake.title);
      showAlert(res.success ? tx("Başarılı") : tx("Bilgi"), res.message);
    } catch (e: any) {
      showAlert(tx("Hata"), tx("Görsel galeriye kaydedilemedi. Lütfen tekrar deneyin."));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPrompt = () => {
    // Web ve mobil uyumlu kopyalama
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cake.prompt);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDeletePrompt = () => {
    showAlert(
      tx("Tasarımı Sil"),
      tx("Bu pasta tasarımını koleksiyonundan silmek istediğine emin misin?"),
      [
        { text: tx("Vazgeç"), style: 'cancel' },
        {
          text: tx("Sil"),
          style: 'destructive',
          onPress: () => {
            onDelete(cake.id);
            onClose();
          },
        },
      ]
    );
  };

  const formattedDate = new Date(cake.createdAt).toLocaleDateString(getTxLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={[home.washTop, home.washMid, home.washEnd]}
          locations={[0, 0.24, 0.58]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Geri")}
            onPress={onClose}
            hitSlop={10}
            style={styles.circleBtn}
          >
            <ChevronLeftIcon size={20} color={home.ink} strokeWidth={2} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>{tx("Tasarım Detayı")}</Text>

          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Sil")}
              onPress={handleDeletePrompt}
              hitSlop={10}
              style={[styles.circleBtn, styles.trashBtn]}
            >
              <TrashIcon size={19} color="#C62828" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Görsel Çerçevesi (Büyütmek için dokunulabilir) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Görseli büyüt")}
            onPress={() => setIsZoomOpen(true)}
            style={({ pressed }) => [
              styles.imageCard,
              pressed && styles.imageCardPressed,
            ]}
          >
            <CakeImage
              source={{ uri: cake.imageUri }}
              style={styles.image}
              contentFit="cover"
              priority="high"
              showShimmer
            />
            <LinearGradient
              colors={['transparent', 'rgba(38, 24, 14, 0.65)']}
              style={styles.imageOverlay}
            >
              <View style={styles.imageOverlayContent}>
                <Text style={styles.overlayTitle}>{tx(cake.title)}</Text>
                <Text style={styles.overlayDate}>{formattedDate}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Aksiyon Butonları (Dengeli, Taşmayan Düzen) */}
          <View style={styles.actionRow}>
            {onRemix && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Tasarımı Düzenle")}
                onPress={() => {
                  onClose();
                  onRemix(cake);
                }}
                style={({ pressed }) => [
                  styles.remixButton,
                  pressed && styles.remixButtonPressed,
                ]}
              >
                <ChefHatIcon size={16} color="#FFFDF9" />
                <Text style={styles.remixButtonText} numberOfLines={1}>{tx("Tasarımı Düzenle")}</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Görseli İndir")}
              onPress={handleDownload}
              disabled={isDownloading}
              style={({ pressed }) => [
                styles.modalDownloadButton,
                pressed && styles.modalDownloadButtonPressed,
              ]}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={home.ink} />
              ) : (
                <>
                  <DownloadIcon size={16} color={home.ink} />
                  <Text style={styles.modalDownloadButtonText} numberOfLines={1}>{tx("Görseli İndir")}</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Pastacı Brifing / Sipariş Kartı */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChefHatIcon size={17} color={home.accentGold} />
              <Text style={styles.sectionTitle}>{tx("PASTACI SİPARİŞ KARTI")}</Text>
            </View>

            <View style={styles.specsCard}>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>{tx("Kategori")}</Text>
                <Text style={styles.specValue}>{tx(cake.title)}</Text>
              </View>

              {cake.details?.guests && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Kişi Sayısı")}</Text>
                  <Text style={styles.specValue}>{tx("{guests} Kişilik", { guests: cake.details.guests })}</Text>
                </View>
              )}

              {cake.details?.tier && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Kat Sayısı")}</Text>
                  <Text style={styles.specValue}>{tx("{tier} Katlı", { tier: cake.details.tier })}</Text>
                </View>
              )}

              {cake.details?.shape && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Şekil")}</Text>
                  <Text style={styles.specValue}>{cake.details.shape}</Text>
                </View>
              )}

              {cake.details?.flavor && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Aroma / Tat")}</Text>
                  <Text style={styles.specValue}>{cake.details.flavor}</Text>
                </View>
              )}

              {cake.details?.coating && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Dış Kaplama")}</Text>
                  <Text style={styles.specValue}>{cake.details.coating}</Text>
                </View>
              )}

              {cake.details?.color && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Renk Paleti")}</Text>
                  <Text style={styles.specValue}>{cake.details.color}</Text>
                </View>
              )}

              {cake.details?.decor && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Süsleme")}</Text>
                  <Text style={styles.specValue}>{cake.details.decor}</Text>
                </View>
              )}

              {cake.details?.writing && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("Üzerindeki Yazı")}</Text>
                  <Text style={styles.specValue}>"{cake.details.writing}"</Text>
                </View>
              )}

              {cake.details?.referenceImageUri && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>{tx("İlham Fotoğrafı")}</Text>
                  <CakeImage
                    source={{ uri: cake.details.referenceImageUri }}
                    style={styles.specThumb}
                    contentFit="cover"
                    borderRadius={6}
                    showShimmer={false}
                  />
                </View>
              )}

              {cake.details?.customNotes && (
                <View style={[styles.specRow, styles.specRowLast]}>
                  <Text style={styles.specKey}>{tx("Özel Notlar")}</Text>
                  <Text style={[styles.specValue, styles.specNotes]}>
                    {cake.details.customNotes}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Tam Sipariş Fişi ve AI Malzeme Rehberini Aç")}
              onPress={() => setIsOrderSheetOpen(true)}
              style={styles.orderSheetBtn}
            >
              <DocumentIcon size={16} color={home.accentGold} />
              <Text style={styles.orderSheetBtnText}>{tx("Tam Sipariş Fişi & AI Malzeme Rehberini Aç")}</Text>
            </Pressable>
          </View>

          {/* Kendi Pastanı Oluştur için AI Şef Masterclass Tarifi */}
          {cake.kind === 'diy' ? (
            <DiyRecipeCard
              recipe={recipeText}
              isLoading={isRecipeLoading}
              error={recipeError}
              onRetry={handleFetchRecipe}
              cakeTitle={cake.title}
              isReadOnly
            />
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeaderBetween}>
                <View style={styles.sectionHeaderLeft}>
                  <SparkleIcon size={16} color={home.accentGold} />
                  <Text style={styles.sectionTitle}>{tx("YAPAY ZEKA TARİFİ")}</Text>
                </View>

                <Pressable
                  onPress={handleCopyPrompt}
                  style={styles.copyBtn}
                  hitSlop={8}
                >
                  {copied ? (
                    <>
                      <CheckIcon size={14} color="#2E7D32" />
                      <Text style={styles.copiedText}>{tx("Kopyalandı")}</Text>
                    </>
                  ) : (
                    <>
                      <CopyIcon size={14} color={home.muted} />
                      <Text style={styles.copyText}>{tx("Kopyala")}</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.promptBox}>
                <Text style={styles.promptText} selectable>
                  {cake.prompt}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <PastryOrderSheetModal
          visible={isOrderSheetOpen}
          onClose={() => setIsOrderSheetOpen(false)}
          title={cake.title}
          kind={cake.kind}
          prompt={cake.prompt}
          imageUri={cake.imageUri}
          details={cake.details}
        />

        {/* Tam Ekran Büyütülmüş Görsel Modalı (Sıfır Siyah Boşluk, Kusursuz Krem Paleti) */}
        <Modal
          visible={isZoomOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setIsZoomOpen(false)}
        >
          <View style={styles.zoomModalRoot}>
            <LinearGradient
              colors={[home.washTop, home.washMid, home.washEnd]}
              locations={[0, 0.24, 0.58]}
              style={StyleSheet.absoluteFill}
            />

            {/* Üst Bar: Kapatma, Başlık, İndirme */}
            <View style={[styles.zoomHeader, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Kapat")}
                onPress={() => setIsZoomOpen(false)}
                hitSlop={12}
                style={styles.circleBtn}
              >
                <CloseIcon size={19} color={home.ink} />
              </Pressable>

              <Text style={styles.zoomHeaderTitle} numberOfLines={1}>
                {tx(cake.title)}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("İndir")}
                onPress={handleDownload}
                hitSlop={12}
                style={styles.circleBtn}
              >
                <DownloadIcon size={18} color={home.ink} />
              </Pressable>
            </View>

            {/* İki Parmakla Büyütüp Küçültülebilen (Pinch-To-Zoom) Görsel */}
            <View style={styles.zoomViewerContainer}>
              {cake.imageUri && <PinchableImageViewer uri={cake.imageUri} />}
            </View>
          </View>
        </Modal>
      </View>
      {consentSheet}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.4)',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: home.ink,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteActiveBtn: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  trashBtn: {
    backgroundColor: '#FFF2F2',
    borderColor: '#FFCDD2',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  imageCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: home.cardGradFrom,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  imageOverlayContent: {
    gap: 4,
  },
  overlayTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#FFFDF9',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  overlayDate: {
    fontSize: 13,
    color: 'rgba(255, 253, 249, 0.82)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  remixButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  remixButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  modalDownloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#E8DCB8',
  },
  modalDownloadButtonPressed: {
    backgroundColor: '#F3ECE0',
    transform: [{ scale: 0.98 }],
  },
  modalDownloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.ink,
  },
  remixButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFDF9',
    letterSpacing: 0.1,
  },
  imageCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  zoomModalRoot: {
    flex: 1,
    backgroundColor: home.bg,
    justifyContent: 'space-between',
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.35)',
    zIndex: 10,
  },
  zoomHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 17,
    color: home.ink,
    letterSpacing: 0.2,
    paddingHorizontal: 12,
  },
  zoomViewerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: home.ink,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  copyText: {
    fontSize: 12,
    fontWeight: '500',
    color: home.muted,
  },
  copiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  specsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.3)',
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specKey: {
    fontSize: 13,
    color: home.muted,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    color: home.ink,
    fontWeight: '600',
  },
  specNotes: {
    maxWidth: '65%',
    textAlign: 'right',
  },
  specThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.6)',
  },
  promptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    padding: 16,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    color: home.ink,
  },
  orderSheetBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(243, 217, 166, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.45)',
  },
  orderSheetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
  },
});

