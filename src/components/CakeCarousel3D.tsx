import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ChefHatIcon, SparkleIcon } from './Icons';
import ShimmerPlaceholder from './ShimmerPlaceholder';
import { Float, NATIVE, PressableScale, ShineSweep } from './motion';
import { type CakeKind } from '../screens/CakeBuilderScreen';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

const WEDDING_CAKE = require('../../assets/wedding-cake.png');
const BIRTHDAY_CAKE = require('../../assets/birthday-cake.png');
const ENGAGEMENT_CAKE = require('../../assets/engagement-cake.png');
const CUSTOM_CAKE = require('../../assets/custom-cake.png');
const MIXER = require('../../assets/mixer.png');

export type CakeItem = {
  id: string;
  kind: CakeKind;
  title: string;
  categoryTag: string;
  subtitle: string;
  image: React.ComponentProps<typeof Image>['source'];
  aspect: number;
  accentColor: string;
  credits: number;
  tags: string[];
};

export const CAKE_ITEMS: CakeItem[] = [
  {
    id: 'wedding',
    kind: 'wedding',
    title: 'Düğün Pastası Couture',
    categoryTag: 'HAUTE PÂTISSERIE',
    subtitle: 'Üç katlı, Barok dantel kabartmalı ve taze frambuaz taçlandırmalı şaheser.',
    image: WEDDING_CAKE,
    aspect: 420 / 301,
    accentColor: '#D4AF37',
    credits: 15,
    tags: ['3 Katlı', 'Barok İşleme', 'Frambuaz'],
  },
  {
    id: 'engagement',
    kind: 'engagement',
    title: 'Nişan & Söz Pastası',
    categoryTag: 'ROMANTIQUE',
    subtitle: 'İki katlı dokulu krem, pudra çiçek buketleri ve cipsofil zarafeti.',
    image: ENGAGEMENT_CAKE,
    aspect: 436 / 340,
    accentColor: '#C97B89',
    credits: 15,
    tags: ['2 Katlı', 'Pudra Çiçekler', 'Cipsofil'],
  },
  {
    id: 'birthday',
    kind: 'birthday',
    title: 'Doğum Günü Pastası',
    categoryTag: 'FESTIF & ÉLÉGANT',
    subtitle: 'Dantel krema, kelebek motifleri ve pudra fiyonk zarafetiyle unutulmaz.',
    image: BIRTHDAY_CAKE,
    aspect: 301 / 337,
    accentColor: '#E08A9E',
    credits: 15,
    tags: ['Kelebek', 'Pudra Pembe', 'Kutlama'],
  },
  {
    id: 'custom',
    kind: 'custom',
    title: 'Özel Tasarım Şaheser',
    categoryTag: 'SUR-MESURE',
    subtitle: 'Saf fildişi krema, kraliyet tacı ve size özel konsept süslemeler.',
    image: CUSTOM_CAKE,
    aspect: 230 / 217,
    accentColor: '#C89D42',
    credits: 15,
    tags: ['Kraliyet Tacı', 'Özel Konsept', 'Lüks'],
  },
  {
    id: 'diy',
    kind: 'diy',
    title: 'Kendi Pastanı Yarat',
    categoryTag: 'ATELIER LIBRE',
    subtitle: 'Hayalindeki tüm lezzet ve tasarım detaylarını dilediğin gibi tarif et.',
    image: MIXER,
    aspect: 281 / 261,
    accentColor: '#8C5E32',
    credits: 15,
    tags: ['Serbest Tasarım', 'AI Fırın', 'Yaratıcı'],
  },
];

type Props = {
  onSelectCake: (kind: CakeKind) => void;
};

export default function CakeCarousel3D({ onSelectCake }: Props) {
  useTx();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Responsive dimensions for the 3D stage (Grand, high-impact hero showcase)
  const maxContainerWidth = Math.min(windowWidth, 460);
  const itemWidth = Math.round(maxContainerWidth * 0.82);
  const sideSpacer = Math.round((maxContainerWidth - itemWidth) / 2);

  // Generous stage height giving the cakes a grand, luxurious presence
  const stageHeight = Math.min(390, Math.max(310, Math.round(windowHeight * 0.42)));
  const cakeMaxHeight = Math.round(stageHeight * 0.88);
  const cakeMaxWidth = Math.round(itemWidth * 0.90);

  // Constants for delicate, refined liquid pagination
  const DOT_SIZE = 6;
  const DOT_GAP = 8;
  const DOT_STEP = DOT_SIZE + DOT_GAP; // 14

  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const prevActiveRef = useRef(activeIndex);

  // Silky smooth card details transition on cake change
  useEffect(() => {
    if (prevActiveRef.current !== activeIndex) {
      prevActiveRef.current = activeIndex;
      cardOpacity.setValue(0.2);
      cardTranslateY.setValue(6);
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: NATIVE,
        }),
      ]).start();
    }
  }, [activeIndex]);

  // Synchronize activeIndex dynamically while dragging
  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      const idx = Math.round(value / itemWidth);
      const clamped = Math.max(0, Math.min(idx, CAKE_ITEMS.length - 1));
      setActiveIndex((prev) => (prev !== clamped ? clamped : prev));
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [itemWidth, scrollX]);

  // Liquid Worm Pill Interpolation Ranges
  const { pillTranslateX, pillScaleX, pillScaleY } = useMemo(() => {
    const N = CAKE_ITEMS.length;
    const inputRange: number[] = [];
    const translateXOutput: number[] = [];
    const scaleXOutput: number[] = [];
    const scaleYOutput: number[] = [];

    for (let i = 0; i < N; i++) {
      inputRange.push(i * itemWidth);
      translateXOutput.push(i * DOT_STEP);
      scaleXOutput.push(1.0);
      scaleYOutput.push(1.0);

      if (i < N - 1) {
        // Subtle elastic stretch at midpoint
        inputRange.push((i + 0.5) * itemWidth);
        translateXOutput.push((i + 0.5) * DOT_STEP);
        scaleXOutput.push(1.25);
        scaleYOutput.push(0.92);
      }
    }

    return {
      pillTranslateX: scrollX.interpolate({
        inputRange,
        outputRange: translateXOutput,
        extrapolate: 'clamp',
      }),
      pillScaleX: scrollX.interpolate({
        inputRange,
        outputRange: scaleXOutput,
        extrapolate: 'clamp',
      }),
      pillScaleY: scrollX.interpolate({
        inputRange,
        outputRange: scaleYOutput,
        extrapolate: 'clamp',
      }),
    };
  }, [itemWidth, scrollX]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / itemWidth);
      const clamped = Math.max(0, Math.min(index, CAKE_ITEMS.length - 1));
      setActiveIndex(clamped);
    },
    [itemWidth]
  );

  const scrollToIndex = useCallback(
    (idx: number) => {
      setActiveIndex(idx);
      (listRef.current as any)?.scrollToOffset({
        offset: idx * itemWidth,
        animated: true,
      });
    },
    [itemWidth]
  );

  const activeCake = CAKE_ITEMS[activeIndex] || CAKE_ITEMS[0];

  return (
    <View style={styles.container}>
      {/* 3D Floating Cake Carousel Track */}
      <View style={[styles.stageContainer, { height: stageHeight }]}>
        <Animated.FlatList
          ref={listRef as any}
          data={CAKE_ITEMS}
          keyExtractor={(item) => item.id}
          // Re-render cells when the active cake or a loaded image changes.
          extraData={`${activeIndex}:${Object.keys(loadedImages).length}`}
          horizontal
          // Without a fixed width the list grows to its content and gets
          // centred by the stage, so it can't scroll and shows the wrong cake.
          style={styles.list}
          showsHorizontalScrollIndicator={false}
          snapToInterval={itemWidth}
          decelerationRate="fast"
          bounces={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: NATIVE }
          )}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          contentContainerStyle={{
            paddingHorizontal: sideSpacer,
            alignItems: 'center',
          }}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * itemWidth,
              index * itemWidth,
              (index + 1) * itemWidth,
            ];

            // 3D Matrix Perspective Interpolations
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1.0, 0.72],
              extrapolate: 'clamp',
            });

            const rotateY = scrollX.interpolate({
              inputRange,
              outputRange: ['36deg', '0deg', '-36deg'],
              extrapolate: 'clamp',
            });

            const rotateZ = scrollX.interpolate({
              inputRange,
              outputRange: ['-3.5deg', '0deg', '3.5deg'],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.42, 1.0, 0.42],
              extrapolate: 'clamp',
            });

            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [16, 0, 16],
              extrapolate: 'clamp',
            });

            const haloOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 0.95, 0.25],
              extrapolate: 'clamp',
            });

            const haloScale = scrollX.interpolate({
              inputRange,
              outputRange: [0.72, 1.12, 0.72],
              extrapolate: 'clamp',
            });

            const shadowScaleX = scrollX.interpolate({
              inputRange,
              outputRange: [0.65, 1.0, 0.65],
              extrapolate: 'clamp',
            });

            const shadowOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.12, 0.38, 0.12],
              extrapolate: 'clamp',
            });

            // Calculate exact cake image dimensions respecting aspect ratio
            const byHeight = cakeMaxHeight / item.aspect;
            const cakeWidth =
              byHeight <= cakeMaxWidth
                ? Math.round(byHeight)
                : cakeMaxWidth;
            const cakeHeight =
              byHeight <= cakeMaxWidth
                ? cakeMaxHeight
                : Math.round(cakeMaxWidth * item.aspect);

            return (
              <Pressable
                onPress={() => {
                  if (index === activeIndex) {
                    onSelectCake(item.kind);
                  } else {
                    scrollToIndex(index);
                  }
                }}
                style={[styles.itemWrapper, { width: itemWidth, height: stageHeight }]}
              >
                {/* 3D Animated Card Mesh */}
                <Animated.View
                  style={[
                    styles.itemInner,
                    {
                      opacity,
                      transform: [
                        { perspective: 1000 },
                        { rotateY },
                        { rotateZ },
                        { scale },
                        { translateY },
                      ],
                    },
                  ]}
                >
                  {/* Warm Radial Ambient Halo Behind Cake - Dynamic Spotlight */}
                  <Animated.View
                    style={[
                      styles.haloContainer,
                      {
                        width: cakeWidth * 1.5,
                        height: cakeHeight * 1.5,
                        opacity: haloOpacity,
                        transform: [{ scale: haloScale }],
                      },
                    ]}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 100 100">
                      <Defs>
                        <RadialGradient id={`halo-${item.id}`} cx="50%" cy="50%" r="50%">
                          <Stop offset="0" stopColor={home.glow} stopOpacity={0.65} />
                          <Stop offset="0.6" stopColor={home.glow} stopOpacity={0.2} />
                          <Stop offset="1" stopColor={home.glow} stopOpacity={0} />
                        </RadialGradient>
                      </Defs>
                      <Rect width="100" height="100" fill={`url(#halo-${item.id})`} />
                    </Svg>
                  </Animated.View>

                  {/* Endless Floating Bobbing Motion */}
                  <Float distance={4} duration={3000 + (index % 3) * 300} delay={index * 120}>
                    <View style={{ width: cakeWidth, height: cakeHeight }}>
                      {/* Soft shimmer so the stage isn't blank while the artwork loads */}
                      {!loadedImages[item.id] && (
                        <ShimmerPlaceholder
                          width={cakeWidth * 0.8}
                          height={cakeHeight * 0.8}
                          borderRadius={28}
                          style={styles.imageShimmer}
                        />
                      )}
                      <Image
                        source={item.image}
                        style={{ width: cakeWidth, height: cakeHeight }}
                        contentFit="contain"
                        transition={220}
                        cachePolicy="memory-disk"
                        accessibilityLabel={tx(item.title)}
                        onLoad={() =>
                          setLoadedImages((prev) =>
                            prev[item.id] ? prev : { ...prev, [item.id]: true },
                          )
                        }
                      />
                    </View>
                  </Float>

                  {/* 3D Dynamic Contact Shadow */}
                  <Animated.View
                    style={[
                      styles.shadowWrapper,
                      {
                        width: cakeWidth * 0.92,
                        opacity: shadowOpacity,
                        transform: [{ scaleX: shadowScaleX }],
                      },
                    ]}
                  >
                    <Svg width="100%" height={20} viewBox="0 0 100 20">
                      <Defs>
                        <RadialGradient id={`shadow-${item.id}`} cx="50%" cy="50%" r="50%">
                          <Stop offset="0" stopColor="#5A3A1A" stopOpacity={0.6} />
                          <Stop offset="0.75" stopColor="#5A3A1A" stopOpacity={0.12} />
                          <Stop offset="1" stopColor="#5A3A1A" stopOpacity={0} />
                        </RadialGradient>
                      </Defs>
                      <Ellipse cx={50} cy={10} rx={48} ry={8} fill={`url(#shadow-${item.id})`} />
                    </Svg>
                  </Animated.View>
                </Animated.View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Liquid Elastic Pagination Pill & Dots */}
      <View style={styles.paginationRow}>
        <View style={styles.paginationTrack}>
          {/* Static Touch-Target Inactive Dots */}
          <View style={styles.dotsRow}>
            {CAKE_ITEMS.map((item, idx) => {
              const dotOpacity = scrollX.interpolate({
                inputRange: [
                  (idx - 0.65) * itemWidth,
                  idx * itemWidth,
                  (idx + 0.65) * itemWidth,
                ],
                outputRange: [1, 0, 1],
                extrapolate: 'clamp',
              });

              const dotScale = scrollX.interpolate({
                inputRange: [
                  (idx - 0.65) * itemWidth,
                  idx * itemWidth,
                  (idx + 0.65) * itemWidth,
                ],
                outputRange: [1, 0.45, 1],
                extrapolate: 'clamp',
              });

              return (
                <Pressable
                  key={item.id}
                  onPress={() => scrollToIndex(idx)}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={tx("{title} pastasını seç", { title: item.title })}
                  style={styles.dotTouchTarget}
                >
                  <Animated.View
                    style={[
                      styles.inactiveDot,
                      {
                        opacity: dotOpacity,
                        transform: [{ scale: dotScale }],
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Active Liquid Gold Pill: Slides & Stretches dynamically with scrollX */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.liquidPill,
              {
                transform: [
                  { translateX: pillTranslateX },
                  { scaleX: pillScaleX },
                  { scaleY: pillScaleY },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#F5D280', '#C69234', '#A8741E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillGradient}
            />
          </Animated.View>
        </View>
      </View>

      {/* Starbucks / Donut Style Bottom Details & Action Card */}
      <View style={styles.detailsCardWrapper}>
        <LinearGradient
          colors={[home.cardGradFrom, home.cardGradTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailsCard}
        >
          {/* Animated Card Content (Smooth glide-in on index change) */}
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            }}
          >
            {/* Card Top: Category Tag & Price Badge */}
            <View style={styles.detailsTopRow}>
              <View
                style={[
                  styles.categoryTagPill,
                  { borderColor: `${activeCake.accentColor}55`, backgroundColor: `${activeCake.accentColor}18` },
                ]}
              >
                <SparkleIcon size={11} color={activeCake.accentColor} />
                <Text style={[styles.categoryTagText, { color: activeCake.accentColor }]}>
                  {activeCake.categoryTag}
                </Text>
              </View>

              <View style={styles.creditsBadge}>
                <Text style={styles.creditsBadgeText}>{tx("✦ {credits} Kredi", { credits: activeCake.credits })}</Text>
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.cakeTitle}>{tx(activeCake.title)}</Text>
            <Text style={styles.cakeSubtitle}>{tx(activeCake.subtitle)}</Text>

            {/* Feature Tags */}
            <View style={styles.tagsRow}>
              {activeCake.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tx(tag)}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Main CTA Button: 'Pastayı Tasarla' */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={tx("{title} Tasarla", { title: activeCake.title })}
            onPress={() => onSelectCake(activeCake.kind)}
            style={styles.ctaWrapper}
            contentStyle={styles.ctaButton}
          >
            <LinearGradient
              colors={[home.ctaFrom, home.ctaTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <ShineSweep initialDelay={1200} interval={3800} />
            <View style={styles.ctaIconCircle}>
              <ChefHatIcon size={18} color={home.accentGold} />
            </View>
            <Text style={styles.ctaButtonText}>{tx("Pasta Tasarla")}</Text>
          </PressableScale>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  stageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  imageShimmer: {
    position: 'absolute',
    alignSelf: 'center',
    top: '10%',
  },
  list: {
    width: '100%',
    flexGrow: 0,
  },
  itemWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  haloContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    opacity: 0.9,
  },
  shadowWrapper: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    zIndex: 1,
  },
  paginationRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
    height: 18,
  },
  paginationTrack: {
    height: 14,
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotTouchTarget: {
    width: 6,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(110, 85, 55, 0.28)',
  },
  liquidPill: {
    position: 'absolute',
    left: 2,
    top: '50%',
    marginTop: -3,
    width: 18,
    height: 6,
    borderRadius: 3,
    shadowColor: '#C69234',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 2,
  },
  pillGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  detailsCardWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    maxWidth: 460,
  },
  detailsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  detailsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  creditsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.65)',
  },
  creditsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A5816',
  },
  cakeTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: home.ink,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  cakeSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: home.body,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(230, 215, 195, 0.65)',
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.muted,
  },
  ctaWrapper: {
    width: '100%',
  },
  ctaButton: {
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#2B170B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 217, 166, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFDF9',
    letterSpacing: 0.3,
  },
});
