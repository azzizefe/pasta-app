import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckIcon,
  ChefHatIcon,
  CopyIcon,
  ShareIcon,
  SparkleIcon,
} from './Icons';
import { fonts, home } from '../theme/theme';

interface Props {
  recipe?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  cakeTitle?: string;
  isReadOnly?: boolean;
}

/**
 * Format raw markdown text into styled React Native blocks:
 * Detects headers (###), bold tags (**text**), and bullet items (* / -).
 */
function renderFormattedRecipe(text: string) {
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <View key={idx} style={styles.paragraphSpacer} />;
    }

    // Markdown H3 or H2 Header: ### Title
    if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
      const headerText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      return (
        <View key={idx} style={styles.headerBlock}>
          <View style={styles.headerDot} />
          <Text style={styles.sectionHeaderTitle}>{headerText}</Text>
        </View>
      );
    }

    // Bullet points: * Item or - Item
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const bulletContent = trimmed.replace(/^[\*\-•]\s*/, '');
      return (
        <View key={idx} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            {renderInlineSpans(bulletContent)}
          </Text>
        </View>
      );
    }

    // Regular paragraph or instruction
    return (
      <Text key={idx} style={styles.regularParagraph}>
        {renderInlineSpans(trimmed)}
      </Text>
    );
  });
}

/**
 * Parses inline **bold** patterns into bold styled <Text> spans.
 */
function renderInlineSpans(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return part;
  });
}

export default function DiyRecipeCard({
  recipe,
  isLoading = false,
  error = null,
  onRetry,
  cakeTitle = 'Özel Ev Yapımı Pasta',
  isReadOnly = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = () => {
    if (!recipe) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(recipe);
    }
    setCopied(true);
    showToast('Pasta tarifi panoya kopyalandı! 📋');
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = async () => {
    if (!recipe) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: `${cakeTitle} - Şefin Özel Ev Yapımı Pasta Tarifi`,
            text: recipe,
          });
          showToast('Tarif başarıyla paylaşıldı! ✨');
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(recipe);
          showToast('Tarif panoya kopyalandı! 📋');
        }
      } else {
        await Share.share({
          title: `${cakeTitle} - Ev Yapımı Pasta Tarifi`,
          message: `${cakeTitle} — Şefin Özel Ev Yapımı Pasta Tarifi\n\n${recipe}`,
        });
      }
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.container}>
      {/* Üst Başlık & Model Rozeti */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.chefIconRing}>
            <ChefHatIcon size={18} color="#FFFDF9" />
          </View>
          <View>
            <Text style={styles.title}>ÖZEL EV YAPIMI PASTA TARİFİ</Text>
            <Text style={styles.subtitle}>Kendi Pastanı Oluştur • Şefin Adım Adım Rehberi</Text>
          </View>
        </View>
      </View>

      {/* Öne Çıkan Hızlı İpuçları Şeridi */}
      <View style={styles.highlightBar}>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightNumber}>170°C</Text>
          <Text style={styles.highlightLabel}>Fırın Derecesi</Text>
        </View>
        <View style={styles.highlightDivider} />
        <View style={styles.highlightItem}>
          <Text style={styles.highlightNumber}>Ölçülü</Text>
          <Text style={styles.highlightLabel}>Yumurta & Gramaj</Text>
        </View>
        <View style={styles.highlightDivider} />
        <View style={styles.highlightItem}>
          <Text style={styles.highlightNumber}>İpeksi</Text>
          <Text style={styles.highlightLabel}>Pastacı Kreması</Text>
        </View>
        <View style={styles.highlightDivider} />
        <View style={styles.highlightItem}>
          <Text style={styles.highlightNumber}>Birebir</Text>
          <Text style={styles.highlightLabel}>Görsel Süsleme</Text>
        </View>
      </View>

      {/* Yükleniyor Durumu */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={home.accentGold} />
          <Text style={styles.loadingTitle}>Usta Şef Pasta Rehberinizi Hazırlıyor...</Text>
          <Text style={styles.loadingSubtitle}>
            Alışveriş listesi, pandispanya fırın derecesi, yumurta adetleri, krema yapımı ve fotoğraftaki süslemenin birebir yapılışı hazırlanıyor.
          </Text>
        </View>
      ) : error ? (
        /* Hata Durumu */
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Tarif Oluşturulamadı</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          {onRetry && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tarifi Tekrar Dene"
              onPress={onRetry}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Tarifi Tekrar Dene</Text>
            </Pressable>
          )}
        </View>
      ) : recipe ? (
        /* Tarif Metni & İçerik */
        <View style={styles.contentCard}>
          <View style={styles.recipeBody}>
            {renderFormattedRecipe(recipe)}
          </View>

          {/* Aksiyon Butonları (Kopyala & Paylaş) */}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tarifi Panoya Kopyala"
              onPress={handleCopy}
              hitSlop={6}
              style={[styles.actionBtn, copied && styles.actionBtnActive]}
            >
              {copied ? (
                <>
                  <CheckIcon size={15} color={home.ink} />
                  <Text style={styles.actionBtnText}>Kopyalandı</Text>
                </>
              ) : (
                <>
                  <CopyIcon size={15} color={home.ink} />
                  <Text style={styles.actionBtnText}>Tarifi Kopyala</Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tarifi Paylaş"
              onPress={handleShare}
              hitSlop={6}
              style={styles.actionBtn}
            >
              <ShareIcon size={15} color={home.ink} />
              <Text style={styles.actionBtnText}>Tarifi Paylaş</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingSubtitle}>Tarif henüz üretilmedi.</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tarif Oluştur</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Toast Bildirimi */}
      {toastMessage && (
        <View style={styles.toast}>
          <SparkleIcon size={14} color={home.accentGold} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(216, 196, 168, 0.45)',
    padding: 18,
    shadowColor: '#2A1A15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.25)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 180,
  },
  chefIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: home.ctaFrom,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 11,
    color: home.muted,
    marginTop: 2,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 217, 166, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  modelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.accentGold,
  },
  highlightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.3)',
  },
  highlightItem: {
    alignItems: 'center',
    flex: 1,
  },
  highlightNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
  },
  highlightLabel: {
    fontSize: 10,
    color: home.muted,
    marginTop: 2,
  },
  highlightDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(216, 196, 168, 0.4)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 10,
  },
  loadingTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
    textAlign: 'center',
    marginTop: 4,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: home.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  errorTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
  },
  errorSubtitle: {
    fontSize: 12,
    color: home.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: home.ctaFrom,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  contentCard: {
    marginTop: 14,
  },
  recipeBody: {
    paddingVertical: 4,
  },
  paragraphSpacer: {
    height: 8,
  },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.25)',
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: home.accentGold,
  },
  sectionHeaderTitle: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
    letterSpacing: 0.4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 3,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: home.accentGold,
    marginTop: 7,
  },
  bulletText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: home.ink,
    flex: 1,
  },
  regularParagraph: {
    fontSize: 12.5,
    lineHeight: 20,
    color: home.ink,
    marginVertical: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#4A2E16',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(216, 196, 168, 0.25)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    borderColor: home.accentGold,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: home.ink,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3E2723',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginTop: 12,
    alignSelf: 'center',
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFDF9',
  },
});
