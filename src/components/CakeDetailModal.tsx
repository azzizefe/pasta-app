import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CakeImage from './CakeImage';
import {
  CheckIcon,
  ChefHatIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  HeartIcon,
  SparkleIcon,
  TrashIcon,
} from './Icons';
import { saveCakeImageToDevice } from '../services/imageSaveService';
import { SavedCake } from '../types/savedCake';
import { fonts, home } from '../theme/theme';

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
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!cake) return null;

  const handleDownload = async () => {
    if (!cake?.imageUri) return;
    setIsDownloading(true);
    try {
      const res = await saveCakeImageToDevice(cake.imageUri, cake.title);
      Alert.alert(res.success ? 'Başarılı' : 'Bilgi', res.message);
    } catch (e: any) {
      Alert.alert('Hata', 'Görsel kaydedilemedi: ' + (e?.message || 'Bilinmeyen sorun'));
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
    Alert.alert(
      'Tasarımı Sil',
      'Bu pasta tasarımını koleksiyonundan silmek istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            onDelete(cake.id);
            onClose();
          },
        },
      ]
    );
  };

  const formattedDate = new Date(cake.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
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
            accessibilityLabel="Kapat"
            onPress={onClose}
            hitSlop={10}
            style={styles.circleBtn}
          >
            <CloseIcon size={20} color={home.ink} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Tasarım Detayı
          </Text>

          <View style={styles.headerRight}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Görseli İndir"
              onPress={handleDownload}
              disabled={isDownloading}
              hitSlop={10}
              style={styles.circleBtn}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={home.ink} />
              ) : (
                <DownloadIcon size={19} color={home.ink} />
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Favori"
              onPress={() => onToggleFavorite(cake.id)}
              hitSlop={10}
              style={[styles.circleBtn, cake.isFavorite && styles.favoriteActiveBtn]}
            >
              <HeartIcon
                size={20}
                color={cake.isFavorite ? '#E53935' : home.ink}
                filled={cake.isFavorite}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sil"
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
          {/* Görsel Çerçevesi */}
          <View style={styles.imageCard}>
            <CakeImage
              source={{ uri: cake.imageUri }}
              style={styles.image}
              contentFit="cover"
              priority="high"
              showShimmer
            />
            <LinearGradient
              colors={['transparent', 'rgba(38, 24, 14, 0.6)']}
              style={styles.imageOverlay}
            >
              <View style={styles.imageOverlayContent}>
                <Text style={styles.overlayTitle}>{cake.title}</Text>
                <Text style={styles.overlayDate}>{formattedDate}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionRow}>
            {onRemix && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onRemix(cake);
                }}
                style={styles.remixButton}
              >
                <ChefHatIcon size={18} color="#FFFDF9" />
                <Text style={styles.remixButtonText}>Bu Tasarımı Düzenle</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Görseli İndir"
              onPress={handleDownload}
              disabled={isDownloading}
              style={styles.modalDownloadButton}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={home.ink} />
              ) : (
                <>
                  <DownloadIcon size={18} color={home.ink} />
                  <Text style={styles.modalDownloadButtonText}>Görseli İndir</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Pastacı Brifing / Sipariş Kartı */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ChefHatIcon size={17} color={home.accentGold} />
              <Text style={styles.sectionTitle}>PASTACI SİPARİŞ KARTI</Text>
            </View>

            <View style={styles.specsCard}>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Kategori</Text>
                <Text style={styles.specValue}>{cake.title}</Text>
              </View>

              {cake.details?.tier && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Kat Sayısı</Text>
                  <Text style={styles.specValue}>{cake.details.tier} Katlı</Text>
                </View>
              )}

              {cake.details?.shape && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Şekil</Text>
                  <Text style={styles.specValue}>{cake.details.shape}</Text>
                </View>
              )}

              {cake.details?.flavor && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Aroma / Tat</Text>
                  <Text style={styles.specValue}>{cake.details.flavor}</Text>
                </View>
              )}

              {cake.details?.color && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Renk Paleti</Text>
                  <Text style={styles.specValue}>{cake.details.color}</Text>
                </View>
              )}

              {cake.details?.decor && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>Süsleme</Text>
                  <Text style={styles.specValue}>{cake.details.decor}</Text>
                </View>
              )}

              {cake.details?.referenceImageUri && (
                <View style={styles.specRow}>
                  <Text style={styles.specKey}>İlham Fotoğrafı</Text>
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
                  <Text style={styles.specKey}>Özel Notlar</Text>
                  <Text style={[styles.specValue, styles.specNotes]}>
                    {cake.details.customNotes}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* AI Prompt / Reçete */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderBetween}>
              <View style={styles.sectionHeaderLeft}>
                <SparkleIcon size={16} color={home.accentGold} />
                <Text style={styles.sectionTitle}>YAPAY ZEKA TARİFİ</Text>
              </View>

              <Pressable
                onPress={handleCopyPrompt}
                style={styles.copyBtn}
                hitSlop={8}
              >
                {copied ? (
                  <>
                    <CheckIcon size={14} color="#2E7D32" />
                    <Text style={styles.copiedText}>Kopyalandı</Text>
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} color={home.muted} />
                    <Text style={styles.copyText}>Kopyala</Text>
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
        </ScrollView>
      </View>
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
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  remixButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#E8DCB8',
  },
  modalDownloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
  },
  remixButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFDF9',
    letterSpacing: 0.2,
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
});

