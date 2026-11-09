import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import CakeTypeSheet, { getCakeType } from './CakeTypeSheet';
import OptionPickerSheet, { type PickerOption } from './OptionPickerSheet';
import {
  ChevronRightIcon,
  CloseIcon,
  LayersIcon,
  PlusIcon,
  SparkleIcon,
  UndoIcon,
  UsersIcon,
} from './Icons';
import { useAiConsentGate } from '../hooks/useAiConsentGate';
import { enhanceCakePrompt } from '../services/geminiPromptService';
import { PressableScale, ShineSweep } from './motion';
import { type CakeKind } from '../screens/CakeBuilderScreen';
import { type CakeDetails, type ImageQuality } from '../types/savedCake';
import { CREDITS_PER_GENERATION, getGenerationCost, useCredits } from '../context/CreditsContext';
import { MAX_EXTRA_REQUEST_LENGTH } from '../utils/security';
import { pickReferenceImage, type PickedImage } from '../utils/pickReferenceImage';
import { showAlert } from '../utils/alert';
import { home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

const GUEST_OPTIONS = [6, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const TIER_OPTIONS = [1, 2, 3, 4, 5];
/** Home designs are always made in 4K. */
const QUALITY: ImageQuality = '4k';
const INPUT_MIN_HEIGHT = 76;
const INPUT_MAX_HEIGHT = 160;
/** Native content size leaves out the box padding; the web one (scrollHeight) already has it. */
const INPUT_PADDING_EXTRA = Platform.OS === 'web' ? 0 : 16;

type Props = {
  /** Starts generating right away with these choices. */
  onGenerate: (kind: CakeKind, details: CakeDetails) => void;
  /** Opens the full builder form, filled in with these choices. */
  onOpenBuilder: (kind: CakeKind, details: CakeDetails) => void;
};

/** Home prompt bar: describe the cake, tweak a few chips, generate. */
export default function PromptComposer({ onGenerate, onOpenBuilder }: Props) {
  useTx();
  const { credits, hasEnoughCredits, openPurchaseModal, isSecondCakeDiscountActive } = useCredits();

  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [kind, setKind] = useState<CakeKind>('custom');
  const [guests, setGuests] = useState<number | null>(null);
  const [tiers, setTiers] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'type' | 'guests' | 'tiers' | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  /** The text before the last enhancement, so it can be undone. */
  const [beforeEnhance, setBeforeEnhance] = useState<string | null>(null);
  const { ensureAiConsent, consentSheet } = useAiConsentGate();
  /** The text box grows with its text (between its min and max height). */
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);

  const canEnhance = text.trim().length >= 3 && !enhancing;

  /** Swaps the whole text; the box shrinks back first so it can measure the new text. */
  const replaceText = (value: string) => {
    setInputHeight(INPUT_MIN_HEIGHT);
    setText(value);
  };

  const handleTextChange = (value: string) => {
    if (!value) setInputHeight(INPUT_MIN_HEIGHT);
    setText(value);
    // Typing after an enhancement keeps the edit; undo would throw it away.
    if (beforeEnhance !== null) setBeforeEnhance(null);
  };

  const handleEnhance = async () => {
    if (!canEnhance) return;
    if (!(await ensureAiConsent())) return;
    setEnhancing(true);
    const original = text;
    const result = await enhanceCakePrompt(original, { kind });
    setEnhancing(false);
    if (result.success && result.prompt) {
      replaceText(result.prompt);
      setBeforeEnhance(original);
      return;
    }
    showAlert(
      tx('İyileştirilemedi'),
      result.error === 'GEMINI_API_KEY_MISSING' || !result.error
        ? tx('Tasarım servisine şu an ulaşılamıyor. Lütfen birkaç dakika sonra tekrar dene.')
        : result.error,
    );
  };

  const handleUndo = () => {
    if (beforeEnhance === null) return;
    replaceText(beforeEnhance);
    setBeforeEnhance(null);
  };

  const cakeType = getCakeType(kind);
  const cost = getGenerationCost(QUALITY, kind, isSecondCakeDiscountActive);
  const listPrice = isSecondCakeDiscountActive ? CREDITS_PER_GENERATION : cost;

  const details = (): CakeDetails => ({
    customNotes: text.trim() || undefined,
    guests: guests ?? undefined,
    tier: tiers ?? undefined,
    quality: QUALITY,
    referenceImageUri: photo?.uri,
    referenceImageBase64: photo?.base64,
  });

  const handleAddPhoto = async () => {
    const picked = await pickReferenceImage();
    if (picked) setPhoto(picked);
  };

  const handleGenerate = () => {
    if (!text.trim() && !photo && !guests && !tiers) {
      showAlert(
        tx('Eksik seçim'),
        tx('Tasarımı oluşturmadan önce en az bir seçenek belirle veya ilham fotoğrafı yükle.'),
      );
      return;
    }
    if (!hasEnoughCredits(cost)) {
      showAlert(
        tx('Yetersiz Kredi'),
        tx('Bu tasarım için {cost} kredi gerekiyor, bakiyende {credits} kredi var. Kredi paketlerine göz atmak ister misin?', {
          cost,
          credits,
        }),
        [
          { text: tx('Vazgeç'), style: 'cancel' },
          { text: tx('Paketleri Gör'), onPress: openPurchaseModal },
        ],
      );
      return;
    }
    onGenerate(kind, details());
  };

  const guestLabel = guests ? tx('{n} Kişi', { n: guests }) : tx('Kişi');
  const tierLabel = tiers ? tx('{n} Katlı', { n: tiers }) : tx('Kat');
  const guestOptions: PickerOption[] = GUEST_OPTIONS.map((n) => ({ value: n, label: tx('{n} Kişi', { n }) }));
  const tierOptions: PickerOption[] = TIER_OPTIONS.map((n) => ({ value: n, label: tx('{n} Katlı', { n }) }));

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {photo && (
          <View style={styles.photoRow}>
            <View style={styles.photoThumb}>
              <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx('Fotoğrafı Kaldır')}
                onPress={() => setPhoto(null)}
                hitSlop={8}
                style={styles.photoRemove}
              >
                <CloseIcon size={11} color="#FFFDF9" strokeWidth={2.4} />
              </Pressable>
            </View>
            <Text style={styles.photoText}>{tx('İlham fotoğrafı eklendi')}</Text>
          </View>
        )}

        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder={tx('Hayalinizdeki pastayı anlatın…')}
          placeholderTextColor={home.muted}
          accessibilityLabel={tx('Pastanızı anlatın')}
          multiline
          editable={!enhancing}
          maxLength={MAX_EXTRA_REQUEST_LENGTH}
          onContentSizeChange={(e) =>
            setInputHeight(
              Math.min(
                INPUT_MAX_HEIGHT,
                Math.max(INPUT_MIN_HEIGHT, Math.ceil(e.nativeEvent.contentSize.height) + INPUT_PADDING_EXTRA),
              ),
            )
          }
          style={[styles.input, { height: inputHeight }, enhancing && styles.inputBusy]}
          textAlignVertical="top"
        />

        <View style={styles.inputFooter}>
          <Text style={styles.counter}>
            {text.length > MAX_EXTRA_REQUEST_LENGTH * 0.8 ? `${text.length}/${MAX_EXTRA_REQUEST_LENGTH}` : ''}
          </Text>
          {beforeEnhance !== null && !enhancing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx('Geri al')}
              onPress={handleUndo}
              hitSlop={8}
              style={({ pressed }) => [styles.undo, pressed && styles.chipPressed]}
            >
              <UndoIcon size={13} color={home.muted} strokeWidth={2} />
              <Text style={styles.undoText}>{tx('Geri al')}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx('İstemi yapay zekayla iyileştir')}
            accessibilityState={{ disabled: !canEnhance, busy: enhancing }}
            disabled={!canEnhance}
            onPress={handleEnhance}
            hitSlop={6}
            style={({ pressed }) => [
              styles.enhance,
              !canEnhance && !enhancing && styles.enhanceDisabled,
              pressed && styles.chipPressed,
            ]}
          >
            {enhancing ? (
              <ActivityIndicator size="small" color={home.gold} style={styles.enhanceSpinner} />
            ) : (
              <SparkleIcon size={12} color={home.gold} />
            )}
            <Text style={styles.enhanceText}>{enhancing ? tx('İyileştiriliyor…') : tx('İyileştir')}</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx('İlham fotoğrafı ekle')}
            onPress={handleAddPhoto}
            style={({ pressed }) => [styles.chip, styles.iconChip, !!photo && styles.chipActive, pressed && styles.chipPressed]}
          >
            <PlusIcon size={15} color={home.ink} />
          </Pressable>

          {/* The type chip gives way first when the row gets tight (long names, other languages). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx('Pasta türü: {kind}', { kind: tx(cakeType.short) })}
            onPress={() => setSheet('type')}
            style={({ pressed }) => [styles.chip, styles.shrinkChip, pressed && styles.chipPressed]}
          >
            <Image source={cakeType.image} style={styles.chipThumb} contentFit="contain" />
            <Text style={[styles.chipText, styles.shrinkText]} numberOfLines={1}>
              {tx(cakeType.short)}
            </Text>
            <ChevronRightIcon size={11} color={home.muted} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tx('Kişi sayısı')}: ${guestLabel}`}
            onPress={() => setSheet('guests')}
            style={({ pressed }) => [styles.chip, !!guests && styles.chipActive, pressed && styles.chipPressed]}
          >
            <UsersIcon size={13} color={guests ? home.gold : home.ink} />
            <Text style={[styles.chipText, !!guests && styles.chipTextActive]} numberOfLines={1}>
              {guestLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tx('Kat sayısı')}: ${tierLabel}`}
            onPress={() => setSheet('tiers')}
            style={({ pressed }) => [styles.chip, !!tiers && styles.chipActive, pressed && styles.chipPressed]}
          >
            <LayersIcon size={13} color={tiers ? home.gold : home.ink} />
            <Text style={[styles.chipText, !!tiers && styles.chipTextActive]} numberOfLines={1}>
              {tierLabel}
            </Text>
          </Pressable>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={tx('Pastayı Oluştur, {cost} Kredi', { cost })}
          onPress={handleGenerate}
          style={styles.generateWrap}
          contentStyle={styles.generate}
        >
          <LinearGradient
            colors={['#FBE5A6', '#E9BD5C', '#CF9A36']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <ShineSweep initialDelay={1600} interval={4200} color="rgba(255, 255, 255, 0.45)" />
          <Text style={styles.generateText}>{tx('Oluştur')}</Text>
          <View style={styles.costPill}>
            <Text style={styles.costStar}>✦</Text>
            {listPrice !== cost && <Text style={styles.costOld}>{listPrice}</Text>}
            <Text style={styles.costText}>{cost}</Text>
          </View>
        </PressableScale>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenBuilder(kind, details())}
        hitSlop={8}
        style={({ pressed }) => [styles.moreLink, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.moreText}>{tx('Tüm seçeneklerle tasarla')}</Text>
        <ChevronRightIcon size={14} color={home.gold} strokeWidth={2} />
      </Pressable>

      <CakeTypeSheet
        visible={sheet === 'type'}
        selected={kind}
        onClose={() => setSheet(null)}
        onSelect={(k) => {
          setKind(k);
          setSheet(null);
        }}
      />
      <OptionPickerSheet
        visible={sheet === 'guests'}
        title={tx('Kaç kişilik olacak?')}
        options={guestOptions}
        selected={guests}
        onClose={() => setSheet(null)}
        onSelect={(v) => {
          setGuests(v);
          setSheet(null);
        }}
      />
      <OptionPickerSheet
        visible={sheet === 'tiers'}
        title={tx('Kaç katlı olacak?')}
        options={tierOptions}
        selected={tiers}
        onClose={() => setSheet(null)}
        onSelect={(v) => {
          setTiers(v);
          setSheet(null);
        }}
      />
      {consentSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 2,
    marginBottom: 4,
  },
  photoThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: home.card,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(28, 17, 9, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: home.gold,
  },
  input: {
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15.5,
    lineHeight: 22,
    color: home.ink,
  },
  inputBusy: {
    opacity: 0.45,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 6,
  },
  counter: {
    flex: 1,
    fontSize: 11,
    color: home.muted,
    marginLeft: 6,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 6,
  },
  undoText: {
    fontSize: 12,
    fontWeight: '600',
    color: home.muted,
  },
  enhance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8CF9C',
    backgroundColor: '#FFF8EA',
  },
  enhanceDisabled: {
    opacity: 0.45,
  },
  enhanceSpinner: {
    transform: [{ scale: 0.7 }],
    width: 12,
    height: 12,
  },
  enhanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: home.gold,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: '#FBF7EF',
    flexShrink: 0,
  },
  iconChip: {
    width: 32,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  shrinkChip: {
    flexShrink: 1,
    minWidth: 0,
  },
  shrinkText: {
    flexShrink: 1,
  },
  chipActive: {
    borderColor: '#D8B270',
    backgroundColor: '#FFF6E3',
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipThumb: {
    width: 17,
    height: 17,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: home.ink,
  },
  chipTextActive: {
    color: home.gold,
  },
  generateWrap: {
    width: '100%',
    marginTop: 12,
  },
  generate: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#B07A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  generateText: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#2E1A0D',
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 26, 13, 0.1)',
  },
  costStar: {
    fontSize: 12,
    color: '#2E1A0D',
  },
  costOld: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(46, 26, 13, 0.5)',
    textDecorationLine: 'line-through',
  },
  costText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E1A0D',
  },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
    paddingVertical: 4,
  },
  moreText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.gold,
  },
});
