import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, CoinsIcon, PlusIcon, SparkleIcon } from '../components/Icons';
import ReferenceImagePicker from '../components/ReferenceImagePicker';
import { PressableScale, ShineSweep } from '../components/motion';
import {
  CREDITS_PER_GENERATION,
  CREDITS_PER_GENERATION_LIST_PRICE,
  useCredits,
} from '../context/CreditsContext';
import CakeResultScreen from './CakeResultScreen';
import { fonts, home } from '../theme/theme';

export type CakeKind = 'wedding' | 'birthday' | 'engagement' | 'custom' | 'diy';

/** Screen title and the lowercase phrase used inside the generated prompt. */
const CAKE_KIND_INFO: Record<CakeKind, { title: string; phrase: string }> = {
  wedding: { title: 'Düğün Pastası', phrase: 'düğün pastası' },
  birthday: { title: 'Doğum Günü Pastası', phrase: 'doğum günü pastası' },
  engagement: { title: 'Nişan Pastası', phrase: 'nişan pastası' },
  custom: { title: 'Özel Pasta', phrase: 'özel pasta' },
  diy: { title: 'Kendi Pastanı Oluştur', phrase: 'ev yapımı pasta' },
};

type Option = {
  label: string;
  /** How this choice reads inside the generated sentence. */
  phrase: string;
};

const DECOR_OPTIONS: Option[] = [
  { label: 'Sade', phrase: 'sade ve minimal süslemeli' },
  { label: 'Orta', phrase: 'dengeli süslemeli' },
  { label: 'Gösterişli', phrase: 'gösterişli ve detaylı süslemeli' },
];

/** Capitalizes using Turkish case rules so "i" becomes "İ", not "I". */
function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
}

type ChipProps = {
  option: Option;
  active: boolean;
  onPress: () => void;
};

function Chip({ option, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={option.label}
      onPress={onPress}
      android_ripple={{ color: home.divider }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{option.label}</Text>
    </Pressable>
  );
}

type SectionProps = {
  title: string;
  options: Option[];
  selected: Option | null;
  onSelect: (option: Option | null) => void;
};

/** Tapping the active chip again clears the selection, like a checkbox. */
function OptionSection({ title, options, selected, onSelect }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Chip
            key={option.label}
            option={option}
            active={selected?.label === option.label}
            onPress={() => onSelect(selected?.label === option.label ? null : option)}
          />
        ))}
      </View>
    </View>
  );
}

type NumberFieldProps = {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  suffix?: string;
  maxLength: number;
};

/** A free-typed number, for values with too wide a range for a chip list. */
function NumberField({
  title,
  value,
  onChangeText,
  placeholder,
  suffix,
  maxLength,
}: NumberFieldProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.numberInputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={home.muted}
          keyboardType="number-pad"
          maxLength={maxLength}
          style={styles.numberInput}
        />
        {suffix ? <Text style={styles.numberSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

type TextFieldProps = {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

/** A free-typed word or phrase, for values too varied for a chip list. */
function TextField({ title, value, onChangeText, placeholder }: TextFieldProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={home.muted}
        style={styles.textField}
      />
    </View>
  );
}

type TagFieldProps = {
  title: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
};

/** Type a word, tap +, and it drops in as a removable tag below. */
function TagField({ title, placeholder, tags, onAdd, onRemove }: TagFieldProps) {
  const [draft, setDraft] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft('');
  }, [draft, onAdd]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={home.muted}
          style={styles.tagInput}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ekle"
          onPress={handleAdd}
          android_ripple={{ color: home.divider, borderless: true }}
          style={styles.tagAddButton}
        >
          <PlusIcon size={18} color="#FDF6E9" />
        </Pressable>
      </View>

      {tags.length > 0 && (
        <View style={[styles.chipRow, styles.tagsRow]}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              accessibilityRole="button"
              accessibilityLabel={`${tag} etiketini kaldır`}
              onPress={() => onRemove(tag)}
              android_ripple={{ color: home.divider }}
              style={[styles.chip, styles.chipActive, styles.tagChip]}
            >
              <Text style={[styles.chipLabel, styles.chipLabelActive]}>{tag}</Text>
              <Text style={styles.tagRemove}>×</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** A list of freely-typed tags with add/remove, backing every TagField. */
function useTagList(): [string[], (tag: string) => void, (tag: string) => void] {
  const [tags, setTags] = useState<string[]>([]);

  const add = useCallback((tag: string) => {
    setTags((prev) =>
      prev.some((item) => item.toLocaleLowerCase('tr-TR') === tag.toLocaleLowerCase('tr-TR'))
        ? prev
        : [...prev, tag],
    );
  }, []);

  const remove = useCallback((tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  }, []);

  return [tags, add, remove];
}

type Props = {
  kind: CakeKind;
  onClose: () => void;
};

/**
 * Full-screen cake configurator: pick serving size, tiers, palette, and
 * decoration density, then compose that into a single design prompt.
 */
export default function CakeBuilderScreen({ kind, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const info = CAKE_KIND_INFO[kind];
  const { credits, hasEnoughCredits, openPurchaseModal } = useCredits();

  const [guestCount, setGuestCount] = useState('');
  const [tierCount, setTierCount] = useState('');
  const [cakeType, setCakeType] = useState('');
  const [coating, setCoating] = useState('');
  const [palette, setPalette] = useState('');
  const [shape, setShape] = useState('');
  const [writing, setWriting] = useState('');
  const [decor, setDecor] = useState<Option | null>(null);
  const [notes, setNotes] = useState('');

  // İlham Fotoğrafı (Image-to-Cake) State'leri
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(null);
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);

  const [fillingTags, addFillingTag, removeFillingTag] = useTagList();
  const [textureTags, addTextureTag, removeTextureTag] = useTagList();
  const [finishTags, addFinishTag, removeFinishTag] = useTagList();
  const [metallicTags, addMetallicTag, removeMetallicTag] = useTagList();
  const [dripTags, addDripTag, removeDripTag] = useTagList();
  const [themeTags, addThemeTag, removeThemeTag] = useTagList();
  const [decorTags, addDecorTag, removeDecorTag] = useTagList();
  const [backgroundTags, addBackgroundTag, removeBackgroundTag] = useTagList();
  const [dietTags, addDietTag, removeDietTag] = useTagList();

  const handleGuestCountChange = useCallback((text: string) => {
    setGuestCount(text.replace(/[^0-9]/g, '').slice(0, 4));
  }, []);

  const handleTierCountChange = useCallback((text: string) => {
    setTierCount(text.replace(/[^0-9]/g, '').slice(0, 2));
  }, []);

  const prompt = useMemo(() => {
    const guestPhrase = guestCount ? `${guestCount} kişilik` : null;
    const tierPhrase = tierCount ? `${tierCount} katlı` : null;
    // Lowercased so a capitalized word (as typed) doesn't stand out mid-sentence.
    const toLower = (text: string) => text.trim().toLocaleLowerCase('tr-TR');
    const cakeTypePhrase = cakeType.trim() ? `${toLower(cakeType)} bazlı` : null;
    const coatingPhrase = coating.trim() ? `${toLower(coating)} kaplamalı` : null;
    const palettePhrase = palette.trim() ? `${toLower(palette)} renklerinde` : null;
    // The shape field's own placeholder ("kalp şeklinde") already reads as a
    // finished phrase, so it goes in as typed instead of getting a suffix.
    const shapePhrase = shape.trim() ? toLower(shape) : null;
    // The written text keeps its own casing — it's literal typography, not an adjective.
    const writingPhrase = writing.trim() ? `üzerinde "${writing.trim()}" yazılı` : null;
    const fragments = [
      guestPhrase,
      tierPhrase,
      ...themeTags.map((tag) => `${toLower(tag)} temalı`),
      palettePhrase,
      cakeTypePhrase,
      ...fillingTags.map((tag) => `${toLower(tag)} dolgulu`),
      coatingPhrase,
      ...textureTags.map((tag) => toLower(tag)),
      ...finishTags.map((tag) => `${toLower(tag)} bitişli`),
      ...metallicTags.map((tag) => `${toLower(tag)} detaylı`),
      ...dripTags.map((tag) => `${toLower(tag)} renginde drip efektli`),
      shapePhrase,
      decor?.phrase,
      ...decorTags.map((tag) => `${toLower(tag)} detaylı`),
      writingPhrase,
      ...backgroundTags.map((tag) => `${toLower(tag)} arka planlı`),
      ...dietTags.map((tag) => toLower(tag)),
    ].filter((phrase): phrase is string => !!phrase);

    const sentence =
      fragments.length > 0
        ? `${capitalize(fragments.join(', '))} bir ${info.phrase} tasarla.`
        : `Bir ${info.phrase} tasarla.`;

    const trimmedNotes = notes.trim();
    return trimmedNotes ? `${sentence} Ek istek: ${trimmedNotes}` : sentence;
  }, [
    guestCount,
    tierCount,
    cakeType,
    fillingTags,
    coating,
    textureTags,
    finishTags,
    palette,
    metallicTags,
    dripTags,
    shape,
    themeTags,
    decor,
    decorTags,
    writing,
    backgroundTags,
    dietTags,
    notes,
    info.phrase,
  ]);

  const hasSelection =
    guestCount ||
    tierCount ||
    cakeType.trim() ||
    fillingTags.length > 0 ||
    coating.trim() ||
    textureTags.length > 0 ||
    finishTags.length > 0 ||
    palette.trim() ||
    metallicTags.length > 0 ||
    dripTags.length > 0 ||
    shape.trim() ||
    themeTags.length > 0 ||
    decor ||
    decorTags.length > 0 ||
    writing.trim() ||
    backgroundTags.length > 0 ||
    dietTags.length > 0 ||
    notes.trim().length > 0 ||
    Boolean(referenceImageUri);

  const [showResult, setShowResult] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!hasSelection) {
      Alert.alert('Eksik seçim', 'Tasarımı oluşturmadan önce en az bir seçenek belirle veya ilham fotoğrafı yükle.');
      return;
    }
    if (!hasEnoughCredits(CREDITS_PER_GENERATION)) {
      Alert.alert(
        'Yetersiz Kredi',
        `Fotoğraf oluşturmak için ${CREDITS_PER_GENERATION} kredi gereklidir. Mevcut bakiyen: ${credits} Kredi.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Kredi Yükle', onPress: openPurchaseModal },
        ],
      );
      return;
    }
    console.log('Generated prompt:', prompt);
    setShowResult(true);
  }, [hasSelection, hasEnoughCredits, credits, openPurchaseModal, prompt]);

  const handleBackToForm = useCallback(() => setShowResult(false), []);

  if (showResult) {
    return (
      <CakeResultScreen
        title={info.title}
        prompt={prompt}
        kind={kind}
        details={{
          tier: tierCount ? parseInt(tierCount, 10) : undefined,
          shape: shape.trim() || undefined,
          flavor: cakeType.trim() || undefined,
          color: palette.trim() || undefined,
          decor: decor?.label,
          customNotes: notes.trim() || undefined,
          referenceImageUri: referenceImageUri || undefined,
          referenceImageBase64: referenceImageBase64 || undefined,
        }}
        referenceImageBase64={referenceImageBase64 || undefined}
        referenceImageUri={referenceImageUri || undefined}
        onBack={handleBackToForm}
      />
    );
  }

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
          onPress={onClose}
          hitSlop={10}
          style={styles.backButton}
        >
          <ChevronLeftIcon size={20} color={home.ink} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {info.title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kredi Bakiyesi"
          onPress={openPurchaseModal}
          style={styles.headerCreditBadge}
        >
          <CoinsIcon size={16} color={home.accentGold} />
          <Text style={styles.headerCreditText}>{credits}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* İlham Fotoğrafı (Image-to-Cake) */}
          <ReferenceImagePicker
            imageUri={referenceImageUri}
            onImageSelected={(uri, base64) => {
              setReferenceImageUri(uri);
              setReferenceImageBase64(base64);
            }}
            onImageRemoved={() => {
              setReferenceImageUri(null);
              setReferenceImageBase64(null);
            }}
          />

          <NumberField
            title="KAÇ KİŞİLİK?"
            value={guestCount}
            onChangeText={handleGuestCountChange}
            placeholder="Örn: 25"
            maxLength={4}
          />

          <NumberField
            title="KAT SAYISI"
            value={tierCount}
            onChangeText={handleTierCountChange}
            placeholder="Örn: 3"
            maxLength={2}
          />

          <TagField
            title="TEMA"
            placeholder="Örn: Rustik"
            tags={themeTags}
            onAdd={addThemeTag}
            onRemove={removeThemeTag}
          />
          <TextField
            title="RENK PALETİ"
            value={palette}
            onChangeText={setPalette}
            placeholder="Örn: Mor & Lila"
          />

          <TextField
            title="KEK TÜRÜ"
            value={cakeType}
            onChangeText={setCakeType}
            placeholder="Örn: Red Velvet"
          />
          <TagField
            title="İÇ MALZEME VE DOLGU"
            placeholder="Örn: Çilek"
            tags={fillingTags}
            onAdd={addFillingTag}
            onRemove={removeFillingTag}
          />
          <TextField
            title="DIŞ KAPLAMA"
            value={coating}
            onChangeText={setCoating}
            placeholder="Örn: Krem Şanti"
          />
          <TagField
            title="YÜZEY DOKUSU"
            placeholder="Örn: Dokulu krema"
            tags={textureTags}
            onAdd={addTextureTag}
            onRemove={removeTextureTag}
          />
          <TagField
            title="BİTİŞ PARLAKLIĞI"
            placeholder="Örn: Parlak (Glossy)"
            tags={finishTags}
            onAdd={addFinishTag}
            onRemove={removeFinishTag}
          />
          <TagField
            title="METALİK AKSAN"
            placeholder="Örn: Altın varak"
            tags={metallicTags}
            onAdd={addMetallicTag}
            onRemove={removeMetallicTag}
          />
          <TagField
            title="DAMLA (DRIP) RENGİ"
            placeholder="Örn: Çikolata"
            tags={dripTags}
            onAdd={addDripTag}
            onRemove={removeDripTag}
          />
          <TextField
            title="ŞEKİL VE FORM"
            value={shape}
            onChangeText={setShape}
            placeholder="Örn: Kalp Şeklinde"
          />
          <OptionSection
            title="SÜSLEME YOĞUNLUĞU"
            options={DECOR_OPTIONS}
            selected={decor}
            onSelect={setDecor}
          />
          <TagField
            title="DIŞ SÜSLEME"
            placeholder="Örn: Şeker çiçek"
            tags={decorTags}
            onAdd={addDecorTag}
            onRemove={removeDecorTag}
          />
          <TextField
            title="ÜZERİNDEKİ YAZI"
            value={writing}
            onChangeText={setWriting}
            placeholder="Örn: Mutlu Yıllar"
          />
          <TagField
            title="ARKA PLAN VE ORTAM"
            placeholder="Örn: Çiçekli masa"
            tags={backgroundTags}
            onAdd={addBackgroundTag}
            onRemove={removeBackgroundTag}
          />
          <TagField
            title="DİYET VE ALERJEN BİLDİRİMLERİ"
            placeholder="Örn: Glutensiz"
            tags={dietTags}
            onAdd={addDietTag}
            onRemove={removeDietTag}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EK İSTEKLERİN</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Örneğin: çilekli iç harç, üzerinde isim yazısı..."
              placeholderTextColor={home.muted}
              multiline
              textAlignVertical="top"
              style={styles.notesInput}
            />
          </View>

        </ScrollView>

        {/* Pinned so the CTA is always one tap away, however long the form gets. */}
        <View style={[styles.generateBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(253, 250, 243, 0)', home.bg]}
            style={styles.generateFade}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Tasarımı Oluştur, ${CREDITS_PER_GENERATION} Kredi`}
            onPress={handleGenerate}
            android_ripple={{ color: 'rgba(243,217,166,0.16)' }}
            scaleTo={0.975}
            style={styles.generateShadow}
            contentStyle={styles.generateHit}
          >
            <LinearGradient
              colors={[home.ctaFrom, home.ctaTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generate}
            >
              <ShineSweep initialDelay={1200} interval={3400} />
              <Text style={styles.generateLabel}>Tasarımı Oluştur</Text>
              <View style={styles.generatePriceRow}>
                <SparkleIcon size={14} color={home.accentGold} />
                <Text style={styles.generateOldPrice}>{CREDITS_PER_GENERATION_LIST_PRICE}</Text>
                <Text style={styles.generatePrice}>{CREDITS_PER_GENERATION} Kredi</Text>
              </View>
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CONTENT_MAX_WIDTH = 460;

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
  headerCreditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    gap: 6,
  },
  headerCreditText: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
  },
  scroll: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: home.muted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
  chipActive: {
    backgroundColor: home.ink,
    borderColor: home.ink,
  },
  chipLabel: {
    fontSize: 14,
    color: home.ink,
  },
  chipLabelActive: {
    color: '#FDF6E9',
    fontWeight: '600',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    paddingHorizontal: 16,
  },
  numberInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: home.ink,
  },
  numberSuffix: {
    marginLeft: 8,
    fontSize: 14,
    color: home.muted,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    paddingLeft: 16,
    paddingRight: 6,
  },
  tagInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: home.ink,
  },
  tagAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.ink,
  },
  tagsRow: {
    marginTop: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagRemove: {
    marginLeft: 7,
    fontSize: 15,
    lineHeight: 15,
    color: '#FDF6E9',
  },
  textField: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: home.ink,
  },
  notesInput: {
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: home.ink,
  },
  generateBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: home.bg,
  },
  generateFade: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    height: 28,
  },
  generateShadow: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH - 40,
    alignSelf: 'center',
    borderRadius: 26,
    backgroundColor: home.ctaTo,
    shadowColor: '#9A6A22',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  generateHit: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  generate: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.32)',
  },
  generateLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FDF6E9',
  },
  generatePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  generateOldPrice: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(253, 246, 233, 0.5)',
    textDecorationLine: 'line-through',
  },
  generatePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: home.accentGold,
  },
});
