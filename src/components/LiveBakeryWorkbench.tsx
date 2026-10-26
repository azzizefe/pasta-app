import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { ChefHatIcon, SparkleIcon } from './Icons';
import { NATIVE } from './motion';
import { fonts, home } from '../theme/theme';

interface Props {
  guestCount: string;
  tierCount: string;
  cakeType: string;
  coating: string;
  palette: string;
  decorLabel?: string;
  fillingTags: string[];
  dripTags: string[];
  metallicTags: string[];
  decorTags: string[];
  writing: string;
  onSelectTiers: (tiers: string) => void;
  onSelectGuests: (guests: string) => void;
}

const QUICK_TIERS = [
  { tiers: '1', guests: '12', label: '1 Kat · Butik' },
  { tiers: '2', guests: '25', label: '2 Kat · Klasik' },
  { tiers: '3', guests: '50', label: '3 Kat · Şölen' },
  { tiers: '4', guests: '90', label: '4 Kat · Kraliyet' },
];

function resolveCakeColors(palette: string, cakeType: string) {
  const combined = `${palette} ${cakeType}`.toLocaleLowerCase('tr-TR');

  if (
    combined.includes('pembe') ||
    combined.includes('pudra') ||
    combined.includes('red velvet') ||
    combined.includes('çilek') ||
    combined.includes('frambuaz') ||
    combined.includes('gül')
  ) {
    return {
      top: '#FCE4EC',
      sideFrom: '#F8BBD0',
      sideTo: '#F48FB1',
      sponge: '#AD1457',
      accent: '#D81B60',
      plate: '#E6CEB2',
    };
  }
  if (
    combined.includes('mor') ||
    combined.includes('lila') ||
    combined.includes('lavanta') ||
    combined.includes('böğürtlen') ||
    combined.includes('yaban mersini')
  ) {
    return {
      top: '#F3E5F5',
      sideFrom: '#E1BEE7',
      sideTo: '#CE93D8',
      sponge: '#6A1B9A',
      accent: '#8E24AA',
      plate: '#DECAB8',
    };
  }
  if (
    combined.includes('çikolata') ||
    combined.includes('kakao') ||
    combined.includes('bitter') ||
    combined.includes('kahve') ||
    combined.includes('karamel')
  ) {
    return {
      top: '#EFEBE9',
      sideFrom: '#D7CCC8',
      sideTo: '#A1887F',
      sponge: '#4E342E',
      accent: '#6D4C41',
      plate: '#E5D2B8',
    };
  }
  if (
    combined.includes('fıstık') ||
    combined.includes('yeşil') ||
    combined.includes('mint') ||
    combined.includes('matcha') ||
    combined.includes('biberiye')
  ) {
    return {
      top: '#F1F8E9',
      sideFrom: '#DCEDC8',
      sideTo: '#AED581',
      sponge: '#558B2F',
      accent: '#689F38',
      plate: '#E3D3BC',
    };
  }
  if (
    combined.includes('mavi') ||
    combined.includes('gece') ||
    combined.includes('okyanus')
  ) {
    return {
      top: '#E3F2FD',
      sideFrom: '#BBDEFB',
      sideTo: '#90CAF9',
      sponge: '#1565C0',
      accent: '#1E88E5',
      plate: '#E1D2BE',
    };
  }

  // Varsayılan: Sıcak Fildişi, Vanilya & Altın Şampanya
  return {
    top: '#FFFDF8',
    sideFrom: '#FAF0DC',
    sideTo: '#EDD8B4',
    sponge: '#C89B54',
    accent: '#C99A4B',
    plate: '#DFC7A7',
  };
}

export default function LiveBakeryWorkbench({
  guestCount,
  tierCount,
  cakeType,
  coating,
  palette,
  decorLabel,
  fillingTags,
  dripTags,
  metallicTags,
  decorTags,
  writing,
  onSelectTiers,
  onSelectGuests,
}: Props) {
  const steamAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const steamLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(steamAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(steamAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    steamLoop.start();
    glowLoop.start();
    return () => {
      steamLoop.stop();
      glowLoop.stop();
    };
  }, [steamAnim, glowAnim]);

  const parsedTiers = Math.min(4, Math.max(1, parseInt(tierCount || '2', 10) || 2));
  const colors = useMemo(
    () => resolveCakeColors(palette, cakeType),
    [palette, cakeType],
  );

  const hasDrip = dripTags.length > 0;
  const hasGold = metallicTags.length > 0 || decorLabel === 'Gösterişli';
  const hasFlowers = decorTags.length > 0 || decorLabel === 'Orta' || decorLabel === 'Gösterişli';

  // Kat geometrileri (alttan üste)
  const tierBoxes = useMemo(() => {
    const all = [
      { w: 124, h: 30, y: 112 }, // 1. kat (en alt)
      { w: 94, h: 26, y: 86 },   // 2. kat
      { w: 68, h: 24, y: 62 },   // 3. kat
      { w: 46, h: 20, y: 42 },   // 4. kat (en üst)
    ];
    return all.slice(0, parsedTiers);
  }, [parsedTiers]);

  const activeStepSummary = useMemo(() => {
    const parts: string[] = [];
    if (cakeType.trim()) parts.push(cakeType.trim());
    if (fillingTags.length > 0) parts.push(`${fillingTags[0]} dolgulu`);
    if (coating.trim()) parts.push(coating.trim());
    if (palette.trim()) parts.push(palette.trim());
    return parts.length > 0
      ? parts.join(' · ')
      : 'Aşağıdan kek hamurunu, dolguyu ve kat sayısını seçerek pastanı şekillendir';
  }, [cakeType, fillingTags, coating, palette]);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#FFFFFF', '#FDF7EC', '#F9EFE0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Üst Fırın Atmosfer Barı */}
      <View style={styles.topRow}>
        <View style={styles.ovenBadge}>
          <View style={styles.ovenDot} />
          <Text style={styles.ovenBadgeText}>TAŞ FIRIN · 175°C · CANLI TEZGÂH</Text>
        </View>
        <View style={styles.portionPill}>
          <ChefHatIcon size={13} color={home.gold} />
          <Text style={styles.portionPillText}>
            {guestCount ? `${guestCount} Kişilik` : '~25 Kişilik'} · {parsedTiers} Kat
          </Text>
        </View>
      </View>

      {/* Orta Sahne: Canlı SVG Pasta & Fırın Buharı */}
      <View style={styles.stageRow}>
        <View style={styles.visualBox}>
          <Animated.View
            style={[
              styles.warmOvenHalo,
              {
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.45, 0.85],
                }),
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1.06],
                    }),
                  },
                ],
              },
            ]}
          />

          <Animated.View
            style={{
              transform: [
                {
                  translateY: steamAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -3],
                  }),
                },
              ],
            }}
          >
            <Svg width={170} height={158} viewBox="0 0 170 158">
              <Defs>
                <SvgLinearGradient id="tierGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={colors.sideFrom} />
                  <Stop offset="0.5" stopColor={colors.top} />
                  <Stop offset="1" stopColor={colors.sideTo} />
                </SvgLinearGradient>
                <SvgLinearGradient id="standGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#E6D2B5" />
                  <Stop offset="0.5" stopColor="#FFF8EB" />
                  <Stop offset="1" stopColor="#C8AE88" />
                </SvgLinearGradient>
              </Defs>

              {/* İnce Fırın Buharı Çizgileri */}
              <Path
                d="M52 28 C49 20, 55 15, 52 8"
                stroke="rgba(201, 154, 75, 0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M118 28 C121 20, 115 15, 118 8"
                stroke="rgba(201, 154, 75, 0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Mermer/Altın Pasta Standı */}
              <Path
                d="M66 142 L104 142 L96 152 L74 152 Z"
                fill="url(#standGrad)"
              />
              <Ellipse cx="85" cy="141" rx="70" ry="6" fill="url(#standGrad)" />

              {/* Pasta Katları (Alttan Üste) */}
              {tierBoxes.map((box, idx) => {
                const x = 85 - box.w / 2;
                return (
                  <React.Fragment key={idx}>
                    {/* Kat Gövdesi */}
                    <Rect
                      x={x}
                      y={box.y}
                      width={box.w}
                      height={box.h}
                      rx={6}
                      fill="url(#tierGrad)"
                      stroke={colors.sideTo}
                      strokeWidth={1}
                    />
                    {/* İç Dolgu Çizgisi (Kek Katmanı Hissi) */}
                    <Path
                      d={`M${x + 4} ${box.y + box.h * 0.52} H${x + box.w - 4}`}
                      stroke={colors.sponge}
                      strokeWidth={1.6}
                      strokeDasharray="4,3"
                      strokeOpacity={0.45}
                    />
                    {/* Üst Yüzey Elipsi */}
                    <Ellipse
                      cx={85}
                      cy={box.y}
                      rx={box.w / 2}
                      ry={4.5}
                      fill={colors.top}
                      stroke={colors.sideTo}
                      strokeWidth={0.8}
                    />
                    {/* Drip (Sos Damlaları) */}
                    {hasDrip && (
                      <Path
                        d={`M${x + 6} ${box.y + 1} Q${x + 12} ${box.y + 12} ${x + 16} ${box.y + 2} Q${x + 24} ${box.y + 15} ${x + 30} ${box.y + 2} Q${85} ${box.y + 14} ${x + box.w - 18} ${box.y + 2} Q${x + box.w - 10} ${box.y + 11} ${x + box.w - 5} ${box.y + 1}`}
                        fill="none"
                        stroke={colors.sponge}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                    )}
                    {/* İnci Bordür / Çiçek Dokunuşları */}
                    {hasFlowers && (
                      <>
                        <Circle
                          cx={x + 10}
                          cy={box.y + box.h - 4}
                          r={3.2}
                          fill={colors.accent}
                          opacity={0.75}
                        />
                        <Circle
                          cx={85}
                          cy={box.y + box.h - 4}
                          r={3.5}
                          fill={colors.accent}
                          opacity={0.85}
                        />
                        <Circle
                          cx={x + box.w - 10}
                          cy={box.y + box.h - 4}
                          r={3.2}
                          fill={colors.accent}
                          opacity={0.75}
                        />
                      </>
                    )}
                  </React.Fragment>
                );
              })}

              {/* En Üst Kat Süsü / Mum / Altın Varak Parıltısı */}
              {(() => {
                const topTier = tierBoxes[tierBoxes.length - 1];
                const topY = topTier ? topTier.y : 86;
                return (
                  <>
                    <Circle cx={78} cy={topY - 5} r={5} fill={colors.accent} opacity={0.85} />
                    <Circle cx={92} cy={topY - 4} r={4.2} fill={colors.sideTo} />
                    <Circle cx={85} cy={topY - 7} r={5.5} fill="#E6B85C" />
                    {hasGold && (
                      <Path
                        d={`M85 ${topY - 22} L87 ${topY - 16} L93 ${topY - 14} L87 ${topY - 12} L85 ${topY - 6} L83 ${topY - 12} L77 ${topY - 14} L83 ${topY - 16} Z`}
                        fill="#D4AF37"
                      />
                    )}
                  </>
                );
              })()}
            </Svg>
          </Animated.View>
        </View>

        {/* Sağ Bilgi & Canlı Karışım Özeti */}
        <View style={styles.workbenchMeta}>
          <Text style={styles.workbenchTitle}>Canlı Hamur & Kat Önizlemesi</Text>
          <Text style={styles.workbenchDesc} numberOfLines={3}>
            {activeStepSummary}
          </Text>

          {writing.trim() ? (
            <View style={styles.writingPreviewPill}>
              <SparkleIcon size={11} color={home.gold} />
              <Text style={styles.writingPreviewText} numberOfLines={1}>
                "{writing.trim()}"
              </Text>
            </View>
          ) : null}

          <View style={styles.sensoryBadges}>
            <View style={styles.sensoryChip}>
              <Text style={styles.sensoryChipText}>
                🌾 {cakeType.trim() || 'Taze Pandispanya'}
              </Text>
            </View>
            {fillingTags.length > 0 && (
              <View style={styles.sensoryChip}>
                <Text style={styles.sensoryChipText}>🍓 {fillingTags[0]}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Hızlı Kat & Kapasite Seçici (Tek Dokunuşla Pasta Yükseltme) */}
      <View style={styles.quickTierBar}>
        {QUICK_TIERS.map((qt) => {
          const isSelected = String(parsedTiers) === qt.tiers;
          return (
            <Pressable
              key={qt.tiers}
              accessibilityRole="button"
              onPress={() => {
                onSelectTiers(qt.tiers);
                if (!guestCount) {
                  onSelectGuests(qt.guests);
                }
              }}
              style={[
                styles.quickTierBtn,
                isSelected && styles.quickTierBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.quickTierBtnText,
                  isSelected && styles.quickTierBtnTextActive,
                ]}
              >
                {qt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.7)',
    overflow: 'hidden',
    shadowColor: '#9A6A22',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ovenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 224, 188, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.3)',
  },
  ovenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E67E22',
  },
  ovenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: home.ink,
  },
  portionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  portionPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: home.ink,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visualBox: {
    width: 158,
    height: 152,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  warmOvenHalo: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(246, 217, 168, 0.42)',
  },
  workbenchMeta: {
    flex: 1,
    gap: 6,
  },
  workbenchTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 16,
    color: home.ink,
  },
  workbenchDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: home.body,
  },
  writingPreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(243, 217, 166, 0.32)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  writingPreviewText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    fontWeight: '600',
    color: home.ink,
  },
  sensoryBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  sensoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sensoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.ink,
  },
  quickTierBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(216, 196, 168, 0.35)',
  },
  quickTierBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTierBtnActive: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
  },
  quickTierBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.ink,
  },
  quickTierBtnTextActive: {
    color: '#FFFDF9',
    fontWeight: '700',
  },
});
