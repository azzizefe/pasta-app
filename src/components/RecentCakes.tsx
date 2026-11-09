import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import CakeImage from './CakeImage';
import CakeDetailModal from './CakeDetailModal';
import { ChevronRightIcon, HeartIcon, SparkleIcon } from './Icons';
import { NATIVE } from './motion';
import { sortLikedFirst, useSavedCakes } from '../context/SavedCakesContext';
import type { CakeDetails, CakeKind, SavedCake } from '../types/savedCake';
import { fonts, home } from '../theme/theme';
import { getTxLocale, tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

/** How many cakes the home screen shows; the rest are in the collection tab. */
const MAX_CAKES = 6;
const GAP = 12;

type Props = {
  onOpenBuilder: (kind: CakeKind, details?: CakeDetails) => void;
  onSeeAll: () => void;
};

/** Home screen list of recent designs. Liking a cake moves it to the top. */
export default function RecentCakes({ onOpenBuilder, onSeeAll }: Props) {
  useTx();
  const { savedCakes, isLoading, toggleFavorite, deleteCake } = useSavedCakes();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rowWidth = Math.min(width - 40, 420);
  const cardWidth = Math.floor((rowWidth - GAP) / 2);
  const cakes = sortLikedFirst(savedCakes).slice(0, MAX_CAKES);
  const selected = savedCakes.find((c) => c.id === selectedId) ?? null;

  if (isLoading) return null;

  return (
    <View style={[styles.root, { width: rowWidth }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {tx('Son Tasarımların')}
        </Text>
        {savedCakes.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx('Tüm tasarımları gör')}
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.seeAllText}>{tx('Tümü')}</Text>
            <ChevronRightIcon size={13} color={home.gold} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {cakes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <SparkleIcon size={16} color={home.gold} />
          </View>
          <Text style={styles.emptyTitle}>{tx('Henüz bir tasarımın yok')}</Text>
          <Text style={styles.emptyText}>{tx('İlk pastanı yukarıdan oluştur, burada görünecek.')}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {cakes.map((cake) => (
            <Animated.View
              key={cake.id}
              layout={LinearTransition.springify().damping(18).stiffness(160)}
              entering={FadeIn.duration(300)}
              style={{ width: cardWidth }}
            >
              <RecentCakeCard
                cake={cake}
                onOpen={() => setSelectedId(cake.id)}
                onToggleLike={() => toggleFavorite(cake.id)}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <CakeDetailModal
        visible={!!selected}
        cake={selected}
        onClose={() => setSelectedId(null)}
        onToggleFavorite={toggleFavorite}
        onDelete={deleteCake}
        onRemix={(cake) => {
          setSelectedId(null);
          onOpenBuilder(cake.kind, cake.details);
        }}
      />
    </View>
  );
}

function RecentCakeCard({
  cake,
  onOpen,
  onToggleLike,
}: {
  cake: SavedCake;
  onOpen: () => void;
  onToggleLike: () => void;
}) {
  const liked = !!cake.isFavorite;
  const date = new Date(cake.createdAt).toLocaleDateString(getTxLocale(), { day: 'numeric', month: 'short' });
  const title = tx(cake.title);

  // The heart sits over the card as a sibling, not inside it: a button can't hold another button.
  return (
    <View style={[styles.card, liked && styles.cardLiked]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        testID={`recent-cake-${cake.id}`}
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.cardPressed}
      >
        <View style={styles.imageWrap}>
          <CakeImage source={{ uri: cake.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" showShimmer />
          <LinearGradient
            colors={['rgba(28, 17, 9, 0.28)', 'transparent']}
            style={styles.imageShade}
            pointerEvents="none"
          />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {cake.details?.tier ? `${tx('{tier} Katlı', { tier: cake.details.tier })} · ${date}` : date}
          </Text>
        </View>
      </Pressable>
      <LikeButton liked={liked} title={title} onPress={onToggleLike} />
    </View>
  );
}

/** Heart on the card; pops when it turns on. */
function LikeButton({ liked, title, onPress }: { liked: boolean; title: string; onPress: () => void }) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!liked) return;
    scale.setValue(0.6);
    RNAnimated.spring(scale, { toValue: 1, friction: 3.5, tension: 180, useNativeDriver: NATIVE }).start();
  }, [liked, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? tx('{title} beğenildi', { title }) : tx('{title} beğen', { title })}
      accessibilityState={{ selected: liked }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.like, liked && styles.likeActive, pressed && { opacity: 0.8 }]}
    >
      <RNAnimated.View style={{ transform: [{ scale }] }}>
        <HeartIcon size={16} color={liked ? '#E5484D' : '#FFFFFF'} filled={liked} strokeWidth={2} />
      </RNAnimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: home.ink,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.gold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardLiked: {
    borderColor: '#F2C4C2',
  },
  cardPressed: {
    opacity: 0.85,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 0.9,
    backgroundColor: home.card,
  },
  imageShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  like: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 17, 9, 0.32)',
  },
  likeActive: {
    backgroundColor: '#FFFFFF',
  },
  cardBody: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 11,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 11.5,
    color: home.muted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E6D3AE',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6E3',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: home.ink,
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: home.body,
    textAlign: 'center',
  },
});
