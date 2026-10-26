import React, { useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ChefHatIcon } from './Icons';
import { Float, ShineSweep } from './motion';
import { home } from '../theme/theme';

let instanceCount = 0;

/** Fixed dimensions ensuring all category cards on the home screen have the exact same size. */
export const CARD_HEIGHT = 198;
const SLOT_BOX_WIDTH = 140;
const SLOT_BOX_HEIGHT = 166;
const DEFAULT_MAX_WIDTH = 138;
const DEFAULT_MAX_HEIGHT = 160;

type Props = {
  image: React.ComponentProps<typeof Image>['source'];
  /** Intrinsic height / width of the artwork. */
  aspect: number;
  /** Use \n to control where the two-line button label breaks. */
  label: string;
  accessibilityLabel: string;
  imageAlt: string;
  onPress: () => void;
  style?: ViewStyle;
  /** Custom uniform height for the card (defaults to CARD_HEIGHT). */
  cardHeight?: number;
  /**
   * Widens the slot for landscape photos (aspect < 1) so they fill their
   * box height instead of floating small inside the default width.
   */
  maxWidth?: number;
  /**
   * Overrides the maximum height of the slot.
   */
  maxHeight?: number;
  /** Opsiyonel fiyat/kampanya rozeti (örn: 30$'dan 20$'a indirim) */
  priceBadge?: {
    old: string;
    current: string;
  };
};

/** Warm halo that lifts the cake off the card. */
function Glow({ id }: { id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="46%" r="52%">
          <Stop offset="0" stopColor={home.glow} stopOpacity={0.55} />
          <Stop offset="0.65" stopColor={home.glow} stopOpacity={0.18} />
          <Stop offset="1" stopColor={home.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Soft contact shadow so the cake reads as standing on the card. */
function ContactShadow({ id, width }: { id: string; width: number }) {
  return (
    <Svg width={width} height={22} style={styles.contactShadow} viewBox="0 0 120 22">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#7A5A2E" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#7A5A2E" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={60} cy={11} rx={52} ry={10} fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * Feature card pairing a cake photograph with the call to action that starts
 * that kind of order. Standardized to a uniform height so every card in the
 * feed has identical dimensions and visual rhythm.
 */
export default function CakeFeatureCard({
  image,
  aspect,
  label,
  accessibilityLabel,
  imageAlt,
  onPress,
  style,
  cardHeight = CARD_HEIGHT,
  maxWidth,
  maxHeight,
  priceBadge,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  // SVG gradient ids must be unique per instance or the cards share a fill.
  const index = useMemo(() => (instanceCount += 1), []);
  const uid = `c${index}`;

  const slotBoxHeight = Math.max(130, cardHeight - 32);
  const slotBoxWidth = Math.min(146, Math.round(slotBoxHeight * 0.88));
  const effectiveMaxHeight = Math.min(maxHeight || (slotBoxHeight - 6), slotBoxHeight - 6);
  const effectiveMaxWidth = Math.min(maxWidth || (slotBoxWidth - 4), slotBoxWidth - 4);

  // Contain the artwork inside the uniform slot without distorting it.
  const { width: cakeWidth, height: cakeHeight } = useMemo(() => {
    const byHeight = effectiveMaxHeight / aspect;

    return byHeight <= effectiveMaxWidth
      ? { width: Math.round(byHeight), height: effectiveMaxHeight }
      : { width: effectiveMaxWidth, height: Math.round(effectiveMaxWidth * aspect) };
  }, [aspect, effectiveMaxWidth, effectiveMaxHeight]);

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <View style={[styles.card, { height: cardHeight }, style]}>
      <LinearGradient
        colors={[home.cardGradFrom, home.cardGradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.row}>
        <View style={[styles.slotBox, { width: slotBoxWidth, height: slotBoxHeight }]}>
          <View style={[styles.cakeSlot, { width: cakeWidth, height: cakeHeight }]}>
            <Glow id={`glow-${uid}`} />
            <ContactShadow id={`floor-${uid}`} width={cakeWidth} />
            {/* Android does not guarantee paint order for overlapping siblings,
                so the photo is lifted above the SVG layers explicitly. */}
            <Float style={styles.cakeLayer} distance={3.5} duration={2800 + (index % 5) * 260} delay={(index % 5) * 180}>
              <Image
                source={image}
                style={{ width: cakeWidth, height: cakeHeight }}
                contentFit="contain"
                transition={250}
                cachePolicy="memory-disk"
                accessibilityLabel={imageAlt}
              />
            </Float>
          </View>
        </View>

        <View style={styles.actionSlot}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              onPress={onPress}
              onPressIn={() => animateTo(0.96)}
              onPressOut={() => animateTo(1)}
              android_ripple={{ color: 'rgba(243,217,166,0.16)' }}
              style={styles.ctaHit}
            >
              <LinearGradient
                colors={[home.ctaFrom, home.ctaTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cta}
              >
                <ShineSweep initialDelay={1400 + (index % 5) * 650} interval={4200} />
                <View style={styles.ctaIconRing}>
                  <ChefHatIcon size={18} color={home.accentGold} />
                </View>
                <Text style={styles.ctaLabel}>{label}</Text>
                {priceBadge && (
                  <View style={styles.priceBadgeRow}>
                    <Text style={styles.priceBadgeOld}>{priceBadge.old}</Text>
                    <Text style={styles.priceBadgeCurrent}>{priceBadge.current}</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: home.cardGradFrom,
    overflow: 'hidden',
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  slotBox: {
    width: SLOT_BOX_WIDTH,
    height: SLOT_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cakeSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cakeLayer: {
    zIndex: 2,
  },
  contactShadow: {
    position: 'absolute',
    bottom: -4,
    zIndex: 1,
  },
  actionSlot: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  ctaHit: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cta: {
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.32)',
    overflow: 'hidden',
  },
  ctaIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
    backgroundColor: 'rgba(243, 217, 166, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.28)',
  },
  ctaLabel: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#FDF6E9',
  },
  priceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(243, 217, 166, 0.35)',
  },
  priceBadgeOld: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(253, 246, 233, 0.55)',
    textDecorationLine: 'line-through',
  },
  priceBadgeCurrent: {
    fontSize: 12,
    fontWeight: '700',
    color: home.accentGold,
  },
});
