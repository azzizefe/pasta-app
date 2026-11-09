import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronDownIcon, ChevronLeftIcon, CoinsIcon, PlusIcon, SparkleIcon } from '../components/Icons';
import CurrencyPickerModal from '../components/CurrencyPickerModal';
import ReferenceImagePicker from '../components/ReferenceImagePicker';
import { PressableScale, ShineSweep } from '../components/motion';
import {
  CREDITS_PER_GENERATION,
  getGenerationCost,
  useCredits,
} from '../context/CreditsContext';
import type { CakeDetails, ImageQuality } from '../types/savedCake';
import CakeResultScreen from './CakeResultScreen';
import { evaluateBudget } from '../utils/budgetHelper';
import { MAX_EXTRA_REQUEST_LENGTH } from '../utils/security';
import { fonts, home } from '../theme/theme';
import { ENV } from '../config/env';
import { getTxLocale, tx } from '../i18n/tx';
import { getDefaultCurrency } from '../i18n/region';
import { useTx } from '../context/LanguageContext';

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

/** Capitalizes with the app language's case rules (Turkish "i" becomes "İ", English "i" stays "I"). */
function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase(getTxLocale()) + text.slice(1);
}



type ChipProps = {
  option: Option;
  active: boolean;
  onPress: () => void;
};

function Chip({ option, active, onPress }: ChipProps) {
  useTx();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tx(option.label)}
      onPress={onPress}
      android_ripple={{ color: home.divider }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{tx(option.label)}</Text>
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
  useTx();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{tx(title)}</Text>
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
  suggestions?: { label: string; value: string }[];
};

/** A free-typed number, with optional one-tap quick-select chips. */
function NumberField({
  title,
  value,
  onChangeText,
  placeholder,
  suffix,
  maxLength,
  suggestions,
}: NumberFieldProps) {
  useTx();
  const isPreset = (v: string) => !!suggestions?.some((item) => item.value === v.trim());
  // The typed field only appears for values the presets don't cover.
  const [showCustom, setShowCustom] = useState(
    !suggestions || suggestions.length === 0 || (value.trim() !== '' && !isPreset(value)),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{tx(title)}</Text>
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionRow}>
          {suggestions.map((item) => {
            const active = !showCustom && value.trim() === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setShowCustom(false);
                  onChangeText(active ? '' : item.value);
                }}
                style={[styles.suggestionChip, active && styles.suggestionChipActive]}
              >
                <Text style={[styles.suggestionText, active && styles.suggestionTextActive]}>
                  {tx(item.label)}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: showCustom }}
            onPress={() => {
              if (showCustom) {
                setShowCustom(false);
                onChangeText('');
              } else {
                setShowCustom(true);
                if (isPreset(value)) onChangeText('');
              }
            }}
            style={[styles.suggestionChip, showCustom && styles.suggestionChipActive]}
          >
            <Text style={[styles.suggestionText, showCustom && styles.suggestionTextActive]}>{tx("Diğer")}</Text>
          </Pressable>
        </View>
      )}
      {showCustom && (
        <View style={styles.numberInputRow}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={home.muted}
            keyboardType="number-pad"
            maxLength={maxLength}
            style={styles.numberInput}
            autoFocus={!!suggestions && suggestions.length > 0}
          />
          {suffix ? <Text style={styles.numberSuffix}>{suffix}</Text> : null}
        </View>
      )}
    </View>
  );
}

type TextFieldProps = {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  suggestions?: string[];
};

/** A free-typed word or phrase, for values too varied for a chip list. */
function TextField({ title, value, onChangeText, placeholder, suggestions }: TextFieldProps) {
  useTx();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{tx(title)}</Text>
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionRow}>
          {suggestions.map((source) => {
            const item = tx(source);
            const active = value.trim().toLocaleLowerCase('tr-TR') === item.toLocaleLowerCase('tr-TR');
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => onChangeText(active ? '' : item)}
                style={[styles.suggestionChip, active && styles.suggestionChipActive]}
              >
                <Text style={[styles.suggestionText, active && styles.suggestionTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
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
  suggestions?: string[];
};

/** Type a word, tap +, and it drops in as a removable tag below. */
function TagField({ title, placeholder, tags, onAdd, onRemove, suggestions }: TagFieldProps) {
  useTx();
  const [draft, setDraft] = useState('');

  const submit = () => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{tx(title)}</Text>
      {suggestions && suggestions.length > 0 && (
        <View style={styles.suggestionRow}>
          {suggestions.map((source) => {
            const item = tx(source);
            const active = tags.some(
              (t) => t.toLocaleLowerCase('tr-TR') === item.toLocaleLowerCase('tr-TR'),
            );
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => (active ? onRemove(item) : onAdd(item))}
                style={[styles.suggestionChip, active && styles.suggestionChipActive]}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.tagInputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={home.muted}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={submit}
          style={styles.tagInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Ekle")}
          onPress={submit}
          disabled={!draft.trim()}
          style={[styles.tagAddButton, !draft.trim() && { opacity: 0.35 }]}
        >
          <PlusIcon size={18} color={home.ctaLabel} strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.tagRow}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            accessibilityRole="button"
            onPress={() => onRemove(tag)}
            style={styles.tagChip}
          >
            <Text style={styles.tagLabel}>{tag}</Text>
            <Text style={styles.tagRemove}>×</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** A list of freely-typed tags with add/remove, backing every TagField. */
function useTagList(initial: string[] = []): [string[], (tag: string) => void, (tag: string) => void] {
  const [tags, setTags] = useState<string[]>(initial);

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

const STEPS = [
  { label: 'Temel', hint: 'Fotoğraf, kişi sayısı ve bütçe' },
  { label: 'Stil', hint: 'Tema, renkler ve süslemeler' },
  { label: 'Lezzet', hint: 'Hamur, dolgu ve son notlar' },
] as const;

/** Three-part progress bar; every step is optional, so any segment can be tapped. */
function StepTabs({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  useTx();
  return (
    <View style={styles.stepWrap}>
      <View accessibilityRole="tablist" style={styles.stepRow}>
        {STEPS.map((item, index) => {
          const active = index === current;
          const reached = index <= current;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={tx(item.label)}
              accessibilityState={{ selected: active }}
              aria-selected={active}
              onPress={() => onSelect(index)}
              hitSlop={6}
              style={styles.stepTab}
            >
              <View style={[styles.stepBar, reached && styles.stepBarReached]} />
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                {index + 1}. {tx(item.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.stepHint}>{tx("{hint} · hepsi isteğe bağlı", { hint: tx(STEPS[current].hint) })}</Text>
    </View>
  );
}

function NextStepButton({ label, onPress }: { label: string; onPress: () => void }) {
  useTx();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx("Sonraki adım: {label}", { label })}
      onPress={onPress}
      style={styles.nextStep}
    >
      <Text style={styles.nextStepText}>{tx("Sonraki: {label} →", { label })}</Text>
    </Pressable>
  );
}

export type OpenBuilderOptions = {
  /** Skip the form and go straight to generating (the caller already checked credits). */
  autoGenerate?: boolean;
};

type Props = {
  kind: CakeKind;
  initialDetails?: CakeDetails;
  onClose: () => void;
} & OpenBuilderOptions;

/**
 * Full-screen cake configurator: pick serving size, tiers, palette, and
 * decoration density, then compose that into a single design prompt.
 */
export default function CakeBuilderScreen({ kind, initialDetails, onClose, autoGenerate }: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const info = CAKE_KIND_INFO[kind];
  const {
    credits,
    hasEnoughCredits,
    openPurchaseModal,
    isSecondCakeDiscountActive,
  } = useCredits();

  const [guestCount, setGuestCount] = useState(
    initialDetails?.guests ? String(initialDetails.guests) : '',
  );
  const [tierCount, setTierCount] = useState(
    initialDetails?.tier ? String(initialDetails.tier) : '',
  );
  const [budget, setBudget] = useState(
    initialDetails?.budget ? String(initialDetails.budget) : '',
  );
  const [currency, setCurrency] = useState(() => initialDetails?.currency ?? getDefaultCurrency());
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [cakeType, setCakeType] = useState(initialDetails?.flavor ?? '');
  const [coating, setCoating] = useState(initialDetails?.coating ?? '');
  const [palette, setPalette] = useState(initialDetails?.color ?? '');
  const [shape, setShape] = useState(initialDetails?.shape ?? '');
  const [decor, setDecor] = useState<Option | null>(
    initialDetails?.decor
      ? DECOR_OPTIONS.find((o) => o.label === initialDetails.decor) ?? null
      : null,
  );
  const [notes, setNotes] = useState(initialDetails?.customNotes ?? '');

  // İlham Fotoğrafı (Image-to-Cake) State'leri
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(
    initialDetails?.referenceImageUri ?? null,
  );
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(
    initialDetails?.referenceImageBase64 ?? null,
  );

  const [fillingTags, addFillingTag, removeFillingTag] = useTagList(
    initialDetails?.fillingTags ?? [],
  );
  const [theme, setTheme] = useState(initialDetails?.themeTags?.[0] ?? '');
  const [texture, setTexture] = useState(initialDetails?.textureTags?.[0] ?? '');
  const finishTags = initialDetails?.finishTags ?? [];
  const metallicTags = initialDetails?.metallicTags ?? [];
  const dripTags = initialDetails?.dripTags ?? [];
  const [decorTags, addDecorTag, removeDecorTag] = useTagList(
    initialDetails?.decorTags ?? [],
  );
  const backgroundTags = initialDetails?.backgroundTags ?? [];
  const [dietTags, addDietTag, removeDietTag] = useTagList(
    initialDetails?.dietTags ?? [],
  );

  const handleGuestCountChange = useCallback((text: string) => {
    setGuestCount(text.replace(/[^0-9]/g, '').slice(0, 4));
  }, []);

  const handleTierCountChange = useCallback((text: string) => {
    setTierCount(text.replace(/[^0-9]/g, '').slice(0, 2));
  }, []);

  const handleBudgetChange = useCallback((text: string) => {
    setBudget(text.replace(/[^0-9]/g, '').slice(0, 8));
  }, []);

  const budgetEvaluation = useMemo(() => {
    return evaluateBudget(budget, guestCount, currency);
  }, [budget, guestCount, currency]);

  const prompt = useMemo(() => {
    const guestPhrase = guestCount ? tx('{n} kişilik', { n: guestCount }) : null;
    const tierPhrase = tierCount ? tx('{n} katlı', { n: tierCount }) : null;
    const budgetPhrase = budgetEvaluation.hasBudget
      ? tx('bütçe odaklı tasarım (~{grams}g porsiyon ölçeğinde {style})', {
          grams: budgetEvaluation.portionWeightGr,
          style:
            budgetEvaluation.tier === 'luxury'
              ? tx('ultra lüks haute pâtisserie detaylarıyla')
              : budgetEvaluation.tier === 'under_minimum' || budgetEvaluation.tier === 'economic'
              ? tx('akıllı ve minimalist butik tasarımıyla')
              : tx('standart butik pastacılık kalitesinde'),
        })
      : null;
    // Lowercased so a capitalized word (as typed) doesn't stand out mid-sentence.
    const toLower = (text: string) => text.trim().toLocaleLowerCase('tr-TR');
    const cakeTypePhrase = cakeType.trim() ? tx('{value} bazlı', { value: toLower(cakeType) }) : null;
    const coatingPhrase = coating.trim() ? tx('{value} kaplamalı', { value: toLower(coating) }) : null;
    const palettePhrase = palette.trim() ? tx('{value} renklerinde', { value: toLower(palette) }) : null;
    // The shape field's own placeholder ("kalp şeklinde") already reads as a
    // finished phrase, so it goes in as typed instead of getting a suffix.
    const shapePhrase = shape.trim() ? toLower(shape) : null;
    const themePhrase = theme.trim() ? tx('{value} temalı', { value: toLower(theme) }) : null;
    const texturePhrase = texture.trim() ? toLower(texture) : null;
    const fragments = [
      guestPhrase,
      tierPhrase,
      budgetPhrase,
      themePhrase,
      palettePhrase,
      cakeTypePhrase,
      ...fillingTags.map((tag) => tx('{value} dolgulu', { value: toLower(tag) })),
      coatingPhrase,
      texturePhrase,
      ...finishTags.map((tag) => tx('{value} bitişli', { value: toLower(tag) })),
      ...metallicTags.map((tag) => tx('{value} detaylı', { value: toLower(tag) })),
      ...dripTags.map((tag) => tx('{value} renginde drip efektli', { value: toLower(tag) })),
      shapePhrase,
      decor ? tx(decor.phrase) : null,
      ...decorTags.map((tag) => tx('{value} detaylı', { value: toLower(tag) })),
      ...backgroundTags.map((tag) => tx('{value} arka planlı', { value: toLower(tag) })),
      ...dietTags.map((tag) => toLower(tag)),
    ].filter((phrase): phrase is string => !!phrase);

    const sentence =
      fragments.length > 0
        ? tx('{details} bir {kind} tasarla.', { details: capitalize(fragments.join(', ')), kind: tx(info.phrase) })
        : tx('Bir {kind} tasarla.', { kind: tx(info.phrase) });

    // Satır sonları ve fazla boşluklar tek boşluğa iner; cümle tek parça kalır.
    const trimmedNotes = notes.replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRA_REQUEST_LENGTH);
    return trimmedNotes ? `${sentence} Ek istek: ${trimmedNotes}` : sentence;
  }, [
    guestCount,
    tierCount,
    cakeType,
    fillingTags,
    coating,
    texture,
    finishTags,
    palette,
    metallicTags,
    dripTags,
    shape,
    theme,
    decor,
    decorTags,
    backgroundTags,
    dietTags,
    notes,
    info.phrase,
    budgetEvaluation,
  ]);

  const hasSelection =
    guestCount ||
    tierCount ||
    budget.trim() ||
    cakeType.trim() ||
    fillingTags.length > 0 ||
    coating.trim() ||
    texture.trim() ||
    finishTags.length > 0 ||
    palette.trim() ||
    metallicTags.length > 0 ||
    dripTags.length > 0 ||
    shape.trim() ||
    theme.trim() ||
    decor ||
    decorTags.length > 0 ||
    backgroundTags.length > 0 ||
    dietTags.length > 0 ||
    notes.trim().length > 0 ||
    Boolean(referenceImageUri);

  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const goToStep = useCallback((next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Going back from an auto-generated result lands on this form, filled in.
  const [showResult, setShowResult] = useState(Boolean(autoGenerate));
  const quality: ImageQuality = initialDetails?.quality ?? '4k';
  const cost = getGenerationCost(quality, kind, isSecondCakeDiscountActive);
  // Only a real, active discount shows a struck-through price; there is no permanent "was" price.
  const listPrice = isSecondCakeDiscountActive ? CREDITS_PER_GENERATION : cost;

  const handleGenerate = useCallback(() => {
    if (!hasSelection) {
      showAlert(tx("Eksik seçim"), tx("Tasarımı oluşturmadan önce en az bir seçenek belirle veya ilham fotoğrafı yükle."));
      return;
    }
    if (!hasEnoughCredits(cost)) {
      showAlert(
        tx("Yetersiz Kredi"),
        tx("Bu tasarım için {cost} kredi gerekiyor, bakiyende {credits} kredi var. Kredi paketlerine göz atmak ister misin?", { cost, credits }),
        [
          { text: tx("Vazgeç"), style: 'cancel' },
          { text: tx("Paketleri Gör"), onPress: openPurchaseModal },
        ],
      );
      return;
    }
    console.log('Generated prompt:', prompt);
    // İndirim burada harcanmaz: sonuç ekranı 10 krediyi düşüp görsel üretilince harcar.
    setShowResult(true);
  }, [hasSelection, hasEnoughCredits, cost, credits, openPurchaseModal, prompt]);

  const handleBackToForm = useCallback(() => setShowResult(false), []);

  if (showResult) {
    return (
      <CakeResultScreen
        title={info.title}
        prompt={prompt}
        kind={kind}
        quality={quality}
        details={{
          quality,
          templateTitle: initialDetails?.templateTitle,
          guests: guestCount ? parseInt(guestCount, 10) : undefined,
          tier: tierCount ? parseInt(tierCount, 10) : undefined,
          budget: budgetEvaluation.hasBudget ? budgetEvaluation.budgetAmount : undefined,
          currency: budgetEvaluation.currency.code,
          budgetTier: budgetEvaluation.hasBudget ? budgetEvaluation.tier : undefined,
          portionWeightGr: budgetEvaluation.portionWeightGr,
          shape: shape.trim() || undefined,
          flavor: cakeType.trim() || undefined,
          coating: coating.trim() || undefined,
          color: palette.trim() || undefined,
          decor: decor?.label,
          fillingTags: fillingTags.length > 0 ? fillingTags : undefined,
          textureTags: texture.trim() ? [texture.trim()] : undefined,
          finishTags: finishTags.length > 0 ? finishTags : undefined,
          metallicTags: metallicTags.length > 0 ? metallicTags : undefined,
          dripTags: dripTags.length > 0 ? dripTags : undefined,
          themeTags: theme.trim() ? [theme.trim()] : undefined,
          decorTags: decorTags.length > 0 ? decorTags : undefined,
          backgroundTags: backgroundTags.length > 0 ? backgroundTags : undefined,
          dietTags: dietTags.length > 0 ? dietTags : undefined,
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
          accessibilityLabel={tx("Geri")}
          onPress={onClose}
          hitSlop={10}
          style={styles.backButton}
        >
          <ChevronLeftIcon size={20} color={home.ink} />
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {tx(info.title)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Kredi Bakiyesi")}
          onPress={openPurchaseModal}
          style={styles.headerCreditBadge}
        >
          <CoinsIcon size={16} color={home.accentGold} />
          <Text style={styles.headerCreditText}>{credits}</Text>
        </Pressable>
      </View>

      <StepTabs current={step} onSelect={goToStep} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* İkinci Pasta İndirim Banner'ı */}
          {isSecondCakeDiscountActive && (
            <View style={styles.secondCakeActiveBanner}>
              <View style={styles.secondCakeActiveBannerLeft}>
                <SparkleIcon size={15} color="#8A5A1C" />
                <Text style={styles.secondCakeActiveBannerText}>{tx("Size Özel Fırsat: Bu tasarımınız")}{' '}<Text style={styles.bannerStrikeText}>{tx("15 Kredi")}</Text>{' '}{tx("yerine sadece")}{' '}<Text style={styles.bannerBoldText}>{tx("10 Kredi")}</Text>!
                </Text>
              </View>
              <View style={styles.bannerDiscountBadge}>
                <Text style={styles.bannerDiscountBadgeText}>{tx("%33 İndirim")}</Text>
              </View>
            </View>
          )}

          {step === 0 && (
            <>
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
                placeholder={tx("Örn: 25")}
                maxLength={4}
                suggestions={[
                  { label: '6 Kişi', value: '6' },
                  { label: '10 Kişi', value: '10' },
                  { label: '15 Kişi', value: '15' },
                  { label: '25 Kişi', value: '25' },
                  { label: '40 Kişi', value: '40' },
                  { label: '50+ Kişi', value: '50' },
                ]}
              />

              <NumberField
                title="KAT SAYISI"
                value={tierCount}
                onChangeText={handleTierCountChange}
                placeholder={tx("Örn: 3")}
                maxLength={2}
                suggestions={[
                  { label: '1 Katlı', value: '1' },
                  { label: '2 Katlı', value: '2' },
                  { label: '3 Katlı', value: '3' },
                  { label: '4 Katlı', value: '4' },
                ]}
              />

              {/* Bütçe ve Para Birimi Seçici */}
              <View style={styles.section}>
                <View style={styles.budgetHeaderRow}>
                  <Text style={styles.sectionLabel}>{tx("PASTA BÜTÇESİ")}</Text>
                  <Text style={styles.budgetOptionalHint}>{tx("İSTEĞE BAĞLI")}</Text>
                </View>
                <View style={styles.budgetInputRow}>
                  <TextInput
                    value={budget}
                    onChangeText={handleBudgetChange}
                    placeholder={tx("Örn: {placeholder}", { placeholder: budgetEvaluation.currency.placeholder })}
                    placeholderTextColor={home.muted}
                    keyboardType="number-pad"
                    maxLength={8}
                    style={styles.budgetInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tx("Para Birimi Seç: {code}", { code: budgetEvaluation.currency.code })}
                    onPress={() => setIsCurrencyPickerOpen(true)}
                    style={styles.currencySelectBtn}
                  >
                    <Text style={styles.currencyBtnFlag}>{budgetEvaluation.currency.flag}</Text>
                    <Text style={styles.currencyBtnText}>
                      {budgetEvaluation.currency.symbol} {budgetEvaluation.currency.code}
                    </Text>
                    <ChevronDownIcon size={14} color={home.ink} />
                  </Pressable>
                </View>

                {/* Akıllı Bütçe & Gramaj Değerlendirme Kartı */}
                {budgetEvaluation.hasBudget && (
                  <View
                    style={[
                      styles.budgetEvaluationCard,
                      budgetEvaluation.badgeStatus === 'warning' && styles.budgetCardWarning,
                      budgetEvaluation.badgeStatus === 'gold' && styles.budgetCardGold,
                    ]}
                  >
                    <View style={styles.budgetBadgeRow}>
                      <View
                        style={[
                          styles.budgetTierBadge,
                          budgetEvaluation.badgeStatus === 'warning' && styles.budgetTierBadgeWarning,
                          budgetEvaluation.badgeStatus === 'gold' && styles.budgetTierBadgeGold,
                        ]}
                      >
                        <Text
                          style={[
                            styles.budgetTierBadgeText,
                            budgetEvaluation.badgeStatus === 'warning' && styles.budgetTierBadgeTextWarning,
                            budgetEvaluation.badgeStatus === 'gold' && styles.budgetTierBadgeTextGold,
                          ]}
                        >
                          {budgetEvaluation.badgeLabel}
                        </Text>
                      </View>
                      <Text style={styles.budgetPerGuestText}>{tx("~{p0} {symbol} / kişi", { p0: budgetEvaluation.perGuest?.toLocaleString(), symbol: budgetEvaluation.currency.symbol })}</Text>
                    </View>

                    <Text style={styles.budgetEvaluationMessage}>
                      {budgetEvaluation.message}
                    </Text>

                    <View style={styles.budgetMetricPills}>
                      <View style={styles.budgetMetricPill}>
                        <Text style={styles.budgetMetricLabel}>{tx("Porsiyon Gramajı")}</Text>
                        <Text style={styles.budgetMetricValue}>{tx("~{portionWeightGr} g / kişi", { portionWeightGr: budgetEvaluation.portionWeightGr })}</Text>
                      </View>
                      <View style={styles.budgetMetricPill}>
                        <Text style={styles.budgetMetricLabel}>{tx("Tahmini Pasta Ağırlığı")}</Text>
                        <Text style={styles.budgetMetricValue}>{tx("~{totalWeightKg} kg", { totalWeightKg: budgetEvaluation.totalWeightKg })}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
              <NextStepButton label={STEPS[1].label} onPress={() => goToStep(1)} />
            </>
          )}

          {step === 1 && (
            <>
              <TextField
                title="TEMA"
                value={theme}
                onChangeText={setTheme}
                placeholder={tx("Örn: Rustik")}
                suggestions={['Romantik', 'Kraliyet Lüks', 'Rustik Bohem', 'Vintage Lambeth', 'Minimalist Modern']}
              />
              <TextField
                title="RENK PALETİ"
                value={palette}
                onChangeText={setPalette}
                placeholder={tx("Örn: Mor & Lila")}
                suggestions={[
                  'Fildişi & Altın',
                  'Pudra Pembe & Krem',
                  'Mor & Lavanta',
                  'Zümrüt & Antep Fıstığı',
                  'Bitter Kakao & Karamel',
                ]}
              />

              <TextField
                title="ŞEKİL VE FORM"
                value={shape}
                onChangeText={setShape}
                placeholder={tx("Örn: Kalp Şeklinde")}
                suggestions={[
                  'Yuvarlak Klasik',
                  'Kalp Şeklinde',
                  'Modern Kare',
                  'Altıgen Geometrik',
                  'Yüksek Silindir (Tall)',
                  'Asimetrik Katlı',
                ]}
              />
              <OptionSection
                title={tx("SÜSLEME YOĞUNLUĞU")}
                options={DECOR_OPTIONS}
                selected={decor}
                onSelect={setDecor}
              />
              <TagField
                title="DIŞ SÜSLEME"
                placeholder={tx("Örn: Şeker çiçek")}
                tags={decorTags}
                onAdd={addDecorTag}
                onRemove={removeDecorTag}
                suggestions={[
                  'Şeker Çiçekler',
                  'Altın Varak Detayı',
                  'Makaronlar & Bezeler',
                  'İnci Taneleri',
                  'Taze Çilek & Meyve',
                  'Çikolata Figürleri',
                  'Kurutulmuş Portakal',
                  'İzomalt Şeker Taç',
                ]}
              />
              <NextStepButton label={STEPS[2].label} onPress={() => goToStep(2)} />
            </>
          )}

          {step === 2 && (
            <>
              <TextField
                title="KEK HAMURU VE TÜRÜ"
                value={cakeType}
                onChangeText={setCakeType}
                placeholder={tx("Örn: Red Velvet")}
                suggestions={[
                  'Madagaskar Vanilyalı',
                  'Red Velvet',
                  'Belçika Çikolatalı',
                  'Antep Fıstıklı Pandispanya',
                  'Limon & Haşhaşlı',
                ]}
              />
              <TagField
                title="İÇ MALZEME VE DOLGU KREMASI"
                placeholder={tx("Örn: Çilek")}
                tags={fillingTags}
                onAdd={addFillingTag}
                onRemove={removeFillingTag}
                suggestions={[
                  'Taze Çilek',
                  'Orman Meyveleri',
                  'Beyaz Çikolata Ganaj',
                  'Fıstık Pralin',
                  'Tuzlu Karamel',
                  'Mascarpone Krema',
                ]}
              />
              <TextField
                title="DIŞ SIVAMA VE KAPLAMA"
                value={coating}
                onChangeText={setCoating}
                placeholder={tx("Örn: Krem Şanti")}
                suggestions={[
                  'İsviçre Mereng Krema',
                  'Pürüzsüz Fondan',
                  'Beyaz Çikolata Ganaj',
                  'Hafif Krema (Naked)',
                  'Kadife Sprey Çikolata',
                ]}
              />
              <TextField
                title="YÜZEY DOKUSU"
                value={texture}
                onChangeText={setTexture}
                placeholder={tx("Örn: Dokulu krema")}
                suggestions={[
                  'Pürüzsüz & Düz',
                  'Spatula Dokulu',
                  'Dalgalı Krema',
                  'Çizgili & Taraklı',
                  'Rustik Sıvama',
                ]}
              />
              <TagField
                title="DİYET VE ALERJEN BİLDİRİMLERİ"
                placeholder={tx("Örn: Glutensiz")}
                tags={dietTags}
                onAdd={addDietTag}
                onRemove={removeDietTag}
                suggestions={[
                  'Glutensiz',
                  'Vegan',
                  'Laktozsuz',
                  'Rafine Şekersiz',
                  'Fındık & Fıstıksız',
                  'Yumurtasız',
                  'Düşük Kalorili',
                ]}
              />

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{tx("EK İSTEKLERİN")}</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={tx("Örneğin: çilekli iç harç, üzerinde isim yazısı...")}
                  placeholderTextColor={home.muted}
                  multiline
                  maxLength={MAX_EXTRA_REQUEST_LENGTH}
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
                <Text style={styles.notesCounter}>
                  {notes.length}/{MAX_EXTRA_REQUEST_LENGTH}
                </Text>
              </View>
            </>
          )}
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
            accessibilityLabel={tx("Tasarımı Oluştur, {cost} Kredi", { cost })}
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
              <Text style={styles.generateLabel}>{tx("Tasarımı Oluştur")}</Text>
              <View style={styles.generatePriceRow}>
                <SparkleIcon size={14} color={home.accentGold} />
                {listPrice > cost && (
                  <Text style={styles.generateOldPrice}>{listPrice}</Text>
                )}
                <Text style={styles.generatePrice}>{tx("{cost} Kredi", { cost })}</Text>
              </View>
            </LinearGradient>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <CurrencyPickerModal
        visible={isCurrencyPickerOpen}
        selectedCurrency={currency}
        onSelect={(curr) => setCurrency(curr.code)}
        onClose={() => setIsCurrencyPickerOpen(false)}
      />
    </View>
  );
}

const CONTENT_MAX_WIDTH = 460;

const styles = StyleSheet.create({
  stepWrap: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepTab: {
    flex: 1,
    gap: 6,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: home.cardBorder,
  },
  stepBarReached: {
    backgroundColor: home.gold,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: home.tabInactive,
  },
  stepLabelActive: {
    color: home.ink,
  },
  stepHint: {
    marginTop: 6,
    fontSize: 12,
    color: home.body,
  },
  nextStep: {
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: '#FFFDF9',
  },
  nextStepText: {
    fontSize: 15,
    fontWeight: '700',
    color: home.ink,
  },
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
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
  },
  suggestionChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.65)',
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(243, 217, 166, 0.42)',
    borderColor: home.gold,
  },
  suggestionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: home.ink,
  },
  suggestionTextActive: {
    color: home.ink,
    fontWeight: '700',
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
  // New styles for TagField tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  tagLabel: {
    fontSize: 14,
    color: home.ink,
  },
  tagRemove: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: home.danger,
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
  budgetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  budgetOptionalHint: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: home.muted,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: home.ink,
  },
  currencySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
  },
  currencyBtnFlag: {
    fontSize: 18,
  },
  currencyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
  budgetEvaluationCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
  budgetCardWarning: {
    backgroundColor: 'rgba(181, 67, 58, 0.05)',
    borderColor: 'rgba(181, 67, 58, 0.28)',
  },
  budgetCardGold: {
    backgroundColor: 'rgba(243, 217, 166, 0.24)',
    borderColor: 'rgba(138, 90, 28, 0.35)',
  },
  budgetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetTierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 36, 22, 0.08)',
  },
  budgetTierBadgeWarning: {
    backgroundColor: 'rgba(181, 67, 58, 0.12)',
  },
  budgetTierBadgeGold: {
    backgroundColor: 'rgba(138, 90, 28, 0.15)',
  },
  budgetTierBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: home.ink,
  },
  budgetTierBadgeTextWarning: {
    color: '#B5433A',
  },
  budgetTierBadgeTextGold: {
    color: '#8A5A1C',
  },
  budgetPerGuestText: {
    fontSize: 12,
    fontWeight: '600',
    color: home.body,
  },
  budgetEvaluationMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: home.ink,
    marginBottom: 10,
  },
  budgetMetricPills: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetMetricPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 36, 22, 0.04)',
    alignItems: 'center',
  },
  budgetMetricLabel: {
    fontSize: 10.5,
    color: home.muted,
    marginBottom: 2,
  },
  budgetMetricValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: home.ink,
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
  notesCounter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 11.5,
    color: home.muted,
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
  secondCakeActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF2DF',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  secondCakeActiveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  secondCakeActiveBannerText: {
    fontSize: 12.5,
    color: home.ink,
    lineHeight: 17,
  },
  bannerStrikeText: {
    textDecorationLine: 'line-through',
    color: home.muted,
  },
  bannerBoldText: {
    fontWeight: '700',
    color: '#8A5A1C',
  },
  bannerDiscountBadge: {
    backgroundColor: '#F7E3B5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bannerDiscountBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8A5A1C',
  },
});
