import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSavedCakes } from '../context/SavedCakesContext';
import { BookmarkIcon, ChefHatIcon, HeartIcon, SparkleIcon } from './Icons';
import CakeDetailModal from './CakeDetailModal';
import CakeImage from './CakeImage';
import { CakeKind, SavedCake, SavedCakeFilter } from '../types/savedCake';
import { fonts, home } from '../theme/theme';

interface Props {
  onOpenBuilder: (kind: CakeKind) => void;
}

const FILTERS: { id: SavedCakeFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'favorites', label: 'Favoriler ❤️' },
  { id: 'wedding', label: 'Düğün' },
  { id: 'birthday', label: 'Doğum Günü' },
  { id: 'engagement', label: 'Nişan' },
  { id: 'custom', label: 'Özel' },
  { id: 'diy', label: 'Kendin Yap' },
];

export default function SavedPane({ onOpenBuilder }: Props) {
  const {
    savedCakes,
    filteredCakes,
    isLoading,
    filter,
    setFilter,
    toggleFavorite,
    deleteCake,
  } = useSavedCakes();

  const [selectedCake, setSelectedCake] = useState<SavedCake | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={home.ink} />
        <Text style={styles.loadingText}>Koleksiyon yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Başlık ve Sayaç */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Koleksiyonum</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{savedCakes.length} Tasarım</Text>
        </View>
      </View>

      {/* Kategori Filtre Çipleri */}
      {savedCakes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          style={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Ana Liste veya Boş Durum */}
      {savedCakes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <BookmarkIcon size={32} color={home.accentGold} />
          </View>
          <Text style={styles.emptyTitle}>Koleksiyonun Henüz Boş</Text>
          <Text style={styles.emptySubtitle}>
            Yapay zeka ile tasarladığın tüm eşsiz pastalar burada saklanır.
            Hayalindeki pastayı hemen oluşturmaya başla!
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenBuilder('wedding')}
            style={styles.emptyCta}
          >
            <SparkleIcon size={17} color="#FFFDF9" />
            <Text style={styles.emptyCtaText}>İlk Pastanı Tasarla</Text>
          </Pressable>
        </View>
      ) : filteredCakes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Tasarım Bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            Seçtiğin filtrede henüz kaydedilmiş bir pasta bulunmuyor.
          </Text>
          <Pressable
            onPress={() => setFilter('all')}
            style={styles.clearFilterButton}
          >
            <Text style={styles.clearFilterText}>Filtreyi Temizle</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {filteredCakes.map((cake) => {
              const formattedDate = new Date(cake.createdAt).toLocaleDateString(
                'tr-TR',
                {
                  day: 'numeric',
                  month: 'short',
                }
              );

              return (
                <Pressable
                  key={cake.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedCake(cake)}
                  style={styles.cardHit}
                >
                  <View style={styles.card}>
                    {/* Görsel */}
                    <View style={styles.imageContainer}>
                      <CakeImage
                        source={{ uri: cake.imageUri }}
                        style={styles.cakeImage}
                        contentFit="cover"
                        showShimmer
                      />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent']}
                        style={styles.cardTopGradient}
                      />

                      {/* Favori Butonu */}
                      <Pressable
                        accessibilityRole="button"
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleFavorite(cake.id);
                        }}
                        hitSlop={8}
                        style={[
                          styles.cardHeartBtn,
                          cake.isFavorite && styles.cardHeartBtnActive,
                        ]}
                      >
                        <HeartIcon
                          size={16}
                          color={cake.isFavorite ? '#E53935' : '#FFFFFF'}
                          filled={cake.isFavorite}
                        />
                      </Pressable>
                    </View>

                    {/* Bilgiler */}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {cake.title}
                      </Text>

                      <View style={styles.cardMeta}>
                        {cake.details?.tier ? (
                          <Text style={styles.cardTag}>
                            {cake.details.tier} Katlı
                          </Text>
                        ) : (
                          <Text style={styles.cardTag}>Özel Tasarım</Text>
                        )}
                        <Text style={styles.cardDate}>{formattedDate}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Detay İnceleme Modalı */}
      <CakeDetailModal
        visible={!!selectedCake}
        cake={selectedCake}
        onClose={() => setSelectedCake(null)}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteCake}
        onRemix={(cake) => {
          setSelectedCake(null);
          onOpenBuilder(cake.kind);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: home.muted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: home.ink,
    letterSpacing: 0.2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(216, 196, 168, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.6)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: home.ink,
  },
  filterScroll: {
    maxHeight: 46,
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  filterChipActive: {
    backgroundColor: home.ctaFrom,
    borderColor: 'rgba(243, 217, 166, 0.4)',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: home.ink,
  },
  filterChipTextActive: {
    color: '#FFFDF9',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginTop: -30,
  },
  emptyIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(243, 217, 166, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(243, 217, 166, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: home.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
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
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  clearFilterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.ink,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  cardHit: {
    width: '48.2%',
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: home.cardGradFrom,
  },
  cakeImage: {
    width: '100%',
    height: '100%',
  },
  cardTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeartBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
    letterSpacing: 0.1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTag: {
    fontSize: 11,
    color: home.muted,
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 10,
    color: 'rgba(110, 85, 55, 0.7)',
  },
});
