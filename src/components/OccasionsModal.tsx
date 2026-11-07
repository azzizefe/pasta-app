import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOccasions } from '../context/OccasionsContext';
import {
  describeLeadTime,
  getDaysUntilOccasion,
  getNextOccasionDate,
  getNextReminderDate,
  getReminderLeadDays,
  OCCASION_TYPE_INFO,
  OccasionType,
  REMINDER_OPTIONS,
  SpecialOccasion,
} from '../types/occasion';
import { CakeDetails, CakeKind } from '../types/savedCake';
import {
  BellIcon,
  CalendarIcon,
  ChefHatIcon,
  ChevronLeftIcon,
  CloseIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from './Icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

const RING_SIZE = 104;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Gold ring that fills as the day approaches: empty a year out, full on the day. */
function CountdownRing({ daysLeft, children }: { daysLeft: number; children: React.ReactNode }) {
  useTx();
  const progress = Math.min(1, Math.max(0.03, (365 - daysLeft) / 365));
  const center = RING_SIZE / 2;
  return (
    <View style={ringStyles.wrap}>
      {/* Rotated on a wrapper (not an SVG group) so the arc starts at 12 o'clock on web too. */}
      <View style={ringStyles.rotor} pointerEvents="none">
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgGradient id="occasionRingGold" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F6E2B8" />
              <Stop offset="1" stopColor="#C99A4B" />
            </SvgGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            stroke="rgba(243, 217, 166, 0.16)"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            stroke="url(#occasionRingGold)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            fill="none"
          />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const ringStyles = StyleSheet.create({
  rotor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ rotate: '-90deg' }],
  },
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenBuilder: (kind: CakeKind, details?: CakeDetails) => void;
}

const MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const MONTH_SHORT = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];

const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const DAY_PILL_WIDTH = 36;
const DAY_PILL_GAP = 4;

// Measured against a leap year so 29 Şubat birthdays stay valid.
function daysInMonth(month: number) {
  return new Date(2024, month, 0).getDate();
}

function describeDistance(daysLeft: number) {
  if (daysLeft === 0) return tx('bugün');
  if (daysLeft === 1) return tx('yarın');
  return tx('{n} gün sonra', { n: daysLeft });
}

/** "1 Ekim Cuma", with the year only when it is not this year. */
function formatShortDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${tx(MONTH_NAMES[date.getMonth()])}${sameYear ? '' : ` ${date.getFullYear()}`} ${tx(WEEKDAYS[date.getDay()])}`;
}

const OCCASION_TYPES: OccasionType[] = [
  'birthday',
  'anniversary',
  'wedding',
  'engagement',
  'celebration',
];

const GOLD = home.accentGold;
const CREAM = '#FFFDF9';

function formatLongDate(date: Date) {
  return `${date.getDate()} ${tx(MONTH_NAMES[date.getMonth()])} ${date.getFullYear()}, ${tx(WEEKDAYS[date.getDay()])}`;
}

function getReminderLabel(occasion: SpecialOccasion, daysLeft: number, nextDate: Date) {
  if (daysLeft <= occasion.reminderDaysBefore) return tx('Hatırlatma zamanı geldi');
  const reminder = new Date(nextDate);
  reminder.setDate(reminder.getDate() - occasion.reminderDaysBefore);
  return tx('Hatırlatma: {day} {month}', { day: reminder.getDate(), month: tx(MONTH_NAMES[reminder.getMonth()]) });
}

function getCountdownLabel(daysLeft: number) {
  if (daysLeft === 0) return tx('Bugün!');
  if (daysLeft === 1) return tx('Yarın!');
  return tx('{n} gün', { n: daysLeft });
}


export default function OccasionsModal({
  visible,
  onClose,
  onOpenBuilder,
}: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const { occasions, addOccasion, deleteOccasion } = useOccasions();

  const [isAdding, setIsAdding] = useState(false);
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedType, setSelectedType] = useState<OccasionType>('birthday');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(15);
  const [notes, setNotes] = useState('');
  const [reminderDays, setReminderDays] = useState(14);
  const [dayStripWidth, setDayStripWidth] = useState(0);
  const dayStripRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const dayStripPlacedRef = useRef(false);

  const monthLength = daysInMonth(selectedMonth);
  const dayNumbers = Array.from({ length: monthLength }, (_, i) => i + 1);
  const draftDate = getNextOccasionDate(selectedMonth, selectedDay);
  const draftDaysLeft = getDaysUntilOccasion(selectedMonth, selectedDay);
  const draftReminder = getNextReminderDate(selectedMonth, selectedDay, reminderDays);
  // True when the day is closer than the chosen lead time, so the reminder comes sooner.
  const reminderShortened =
    getReminderLeadDays(selectedMonth, selectedDay, draftReminder) < reminderDays;
  const reminderLabel =
    tx(REMINDER_OPTIONS.find((o) => o.days === reminderDays)?.label ?? '{n} gün önce', { n: reminderDays });

  // Keeps the chosen day centred in the strip: jumps there when the form opens, glides after.
  useEffect(() => {
    if (!isAdding || !dayStripWidth) {
      dayStripPlacedRef.current = false;
      return;
    }
    const x =
      (selectedDay - 1) * (DAY_PILL_WIDTH + DAY_PILL_GAP) + DAY_PILL_WIDTH / 2 - dayStripWidth / 2;
    dayStripRef.current?.scrollTo({ x: Math.max(0, x), animated: dayStripPlacedRef.current });
    dayStripPlacedRef.current = true;
  }, [isAdding, selectedDay, selectedMonth, dayStripWidth]);

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setSelectedDay((d) => Math.min(d, daysInMonth(month)));
  };

  const handleSaveOccasion = async () => {
    if (!personName.trim()) {
      showAlert(tx("Eksik Bilgi"), tx("Lütfen kişi adını giriniz."));
      return;
    }

    const typeInfo = OCCASION_TYPE_INFO[selectedType];
    await addOccasion({
      personName: personName.trim(),
      relationship: relationship.trim() || undefined,
      title: `${personName.trim()}'in ${typeInfo.label}`,
      month: selectedMonth,
      day: selectedDay,
      type: selectedType,
      notes: notes.trim() || undefined,
      reminderDaysBefore: reminderDays,
    });

    const reminderAt = tx("{date} sabah 10:00'da", { date: formatShortDate(draftReminder) });
    const reminderText = reminderShortened
      ? tx('Özel gün yakın olduğu için ilk bildirim {when} gelecek.', { when: reminderAt })
      : reminderDays === 0
        ? tx('Özel günün sabahı, {when} bildirim gelecek.', { when: reminderAt })
        : tx('Özel günden {lead} önce, {when} bildirim gelecek.', { lead: describeLeadTime(reminderDays), when: reminderAt });

    setIsAdding(false);
    setPersonName('');
    setRelationship('');
    setNotes('');
    setReminderDays(14);

    showAlert(tx("Hatırlatıcı Kuruldu ✨"), reminderText);
  };

  const handleDelete = (occasion: SpecialOccasion) => {
    showAlert(
      tx("Hatırlatıcıyı Sil"),
      tx("\"{title}\" hatırlatıcısını silmek istediğinize emin misiniz?", { title: `${occasion.personName} · ${tx(OCCASION_TYPE_INFO[occasion.type].label)}` }),
      [
        { text: tx("Vazgeç"), style: 'cancel' },
        {
          text: tx("Sil"),
          style: 'destructive',
          onPress: () => deleteOccasion(occasion.id),
        },
      ]
    );
  };

  // Carries the person's saved preferences into the builder so the design starts from them.
  const handleDesign = (occasion: SpecialOccasion) => {
    onClose();
    onOpenBuilder(
      OCCASION_TYPE_INFO[occasion.type].defaultKind,
      occasion.notes ? { customNotes: occasion.notes } : undefined,
    );
  };

  // occasions is already sorted nearest-first by the context.
  const [spotlight, ...rest] = occasions;

  const renderSpotlight = (occasion: SpecialOccasion) => {
    const typeInfo = OCCASION_TYPE_INFO[occasion.type];
    const daysLeft = getDaysUntilOccasion(occasion.month, occasion.day);
    const nextDate = getNextOccasionDate(occasion.month, occasion.day);

    return (
      <LinearGradient
        colors={[home.ctaFrom, home.ctaTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.spotlight}
      >
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />

        <View style={styles.spotlightTopRow}>
          <View style={styles.spotlightEyebrow}>
            <SparkleIcon size={12} color={GOLD} />
            <Text style={styles.spotlightEyebrowText}>{tx("SIRADAKİ ÖZEL GÜN")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Hatırlatıcıyı sil")}
            onPress={() => handleDelete(occasion)}
            hitSlop={10}
            style={styles.spotlightDelete}
          >
            <TrashIcon size={15} color="rgba(255, 253, 249, 0.7)" />
          </Pressable>
        </View>

        <View style={styles.spotlightBody}>
          <CountdownRing daysLeft={daysLeft}>
            {daysLeft <= 1 ? (
              <Text style={styles.countdownTileToday}>{getCountdownLabel(daysLeft)}</Text>
            ) : (
              <>
                <Text style={styles.countdownTileNumber}>{daysLeft}</Text>
                <Text style={styles.countdownTileLabel}>{tx("GÜN KALDI")}</Text>
              </>
            )}
          </CountdownRing>

          <View style={styles.spotlightInfo}>
            <Text style={styles.spotlightName} numberOfLines={1}>
              {occasion.personName}
            </Text>
            <Text style={styles.spotlightType} numberOfLines={1}>
              {tx(typeInfo.label)}
              {occasion.relationship ? ` · ${occasion.relationship}` : ''}
            </Text>
            <Text style={styles.spotlightDate}>{formatLongDate(nextDate)}</Text>
          </View>
        </View>

        {occasion.notes && (
          <Text style={styles.spotlightNotes} numberOfLines={2}>
            “{occasion.notes}”
          </Text>
        )}

        <View style={styles.spotlightFooter}>
          <View style={styles.spotlightReminder}>
            <BellIcon size={14} color={GOLD} />
            <Text style={styles.spotlightReminderText} numberOfLines={1}>
              {getReminderLabel(occasion, daysLeft, nextDate)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => handleDesign(occasion)}
            style={({ pressed }) => [styles.spotlightCta, pressed && styles.pressed]}
          >
            <ChefHatIcon size={15} color={home.ink} />
            <Text style={styles.spotlightCtaText}>{tx("Pastasını Tasarla")}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  };

  const renderOccasionCard = (occasion: SpecialOccasion) => {
    const typeInfo = OCCASION_TYPE_INFO[occasion.type];
    const daysLeft = getDaysUntilOccasion(occasion.month, occasion.day);
    const nextDate = getNextOccasionDate(occasion.month, occasion.day);
    const isVerySoon = daysLeft <= occasion.reminderDaysBefore;

    return (
      <View key={occasion.id} style={styles.occasionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateTile}>
            <View style={styles.dateTileStrip}>
              <Text style={styles.dateTileMonth}>{tx(MONTH_SHORT[occasion.month - 1])}</Text>
            </View>
            <Text style={styles.dateTileDay}>{occasion.day}</Text>
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.titleLine}>
              <Text style={styles.cardPerson} numberOfLines={1}>
                {occasion.personName}
              </Text>
              {occasion.relationship && (
                <View style={styles.relChip}>
                  <Text style={styles.relChipText}>{occasion.relationship}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardType} numberOfLines={1}>
              {tx(typeInfo.label)} · {tx(WEEKDAYS[nextDate.getDay()])}
            </Text>
            <View style={styles.reminderLine}>
              <BellIcon size={12} color={isVerySoon ? '#C2410C' : home.body} />
              <Text style={[styles.reminderText, isVerySoon && styles.reminderTextSoon]}>
                {getReminderLabel(occasion, daysLeft, nextDate)}
              </Text>
            </View>
          </View>

          <View style={[styles.countdownPill, isVerySoon && styles.countdownPillSoon]}>
            <Text style={[styles.countdownPillText, isVerySoon && styles.countdownPillTextSoon]}>
              {getCountdownLabel(daysLeft)}
            </Text>
          </View>
        </View>

        {occasion.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesText} numberOfLines={2}>
              {occasion.notes}
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleDesign(occasion)}
            style={({ pressed }) => [styles.actionDesignBtn, pressed && styles.pressed]}
          >
            <ChefHatIcon size={15} color={CREAM} />
            <Text style={styles.actionDesignText}>{tx("Pastasını Tasarla")}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Hatırlatıcıyı sil")}
            onPress={() => handleDelete(occasion)}
            hitSlop={8}
            style={({ pressed }) => [styles.actionDeleteBtn, pressed && styles.pressed]}
          >
            <TrashIcon size={16} color={home.danger} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
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
            accessibilityLabel={tx("Geri")}
            onPress={onClose}
            hitSlop={10}
            style={styles.circleBtn}
          >
            <ChevronLeftIcon size={20} color={home.ink} strokeWidth={2} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{tx("Özel Gün Takvimi")}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isAdding ? tx("Formu kapat") : tx("Yeni özel gün ekle")}
            onPress={() => setIsAdding((prev) => !prev)}
            hitSlop={10}
            style={[styles.circleBtn, styles.addBtn, isAdding && styles.addBtnActive]}
          >
            {isAdding ? (
              <CloseIcon size={18} color={home.ink} />
            ) : (
              <PlusIcon size={20} color={CREAM} />
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Yeni Gün Ekleme Formu */}
          {isAdding && (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <SparkleIcon size={14} color={home.gold} />
                </View>
                <View>
                  <Text style={styles.formTitle}>{tx("Yeni Özel Gün")}</Text>
                  <Text style={styles.formSubtitle}>{tx("{reminderLabel} hatırlatılırsın", { reminderLabel })}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Kişi Adı *")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={tx("Örn: Ayşe, Mehmet, Annem")}
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={personName}
                  onChangeText={setPersonName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Yakınlık Derecesi (Opsiyonel)")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={tx("Örn: Eşim, Kardeşim, Arkadaşım")}
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={relationship}
                  onChangeText={setRelationship}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Özel Gün Türü")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {OCCASION_TYPES.map((t) => {
                    const info = OCCASION_TYPE_INFO[t];
                    const isActive = selectedType === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setSelectedType(t)}
                        style={[styles.chip, isActive && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {tx(info.label)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Tarih")}</Text>
                <View style={styles.dateCard}>
                  <View style={styles.optionGrid}>
                    {[0, 6].map((rowStart) => (
                      <View key={rowStart} style={styles.optionRow}>
                        {MONTH_NAMES.slice(rowStart, rowStart + 6).map((name, i) => {
                          const mNum = rowStart + i + 1;
                          const isSel = selectedMonth === mNum;
                          return (
                            <Pressable
                              key={name}
                              accessibilityRole="button"
                              accessibilityLabel={name}
                              accessibilityState={{ selected: isSel }}
                              onPress={() => handleSelectMonth(mNum)}
                              style={({ pressed }) => [
                                styles.optionCell,
                                isSel && styles.optionCellActive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={[styles.optionText, isSel && styles.optionTextActive]}>
                                {name.slice(0, 3)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <View style={styles.dateDivider} />

                  <ScrollView
                    ref={dayStripRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dayStrip}
                    onLayout={(e) => setDayStripWidth(e.nativeEvent.layout.width)}
                  >
                    {dayNumbers.map((d) => {
                      const isSel = selectedDay === d;
                      const weekday = getNextOccasionDate(selectedMonth, d).getDay();
                      return (
                        <Pressable
                          key={d}
                          accessibilityRole="button"
                          accessibilityLabel={`${d} ${tx(MONTH_NAMES[selectedMonth - 1])}, ${tx(WEEKDAYS[weekday])}`}
                          accessibilityState={{ selected: isSel }}
                          onPress={() => setSelectedDay(d)}
                          style={({ pressed }) => [
                            styles.dayPill,
                            isSel && styles.dayPillActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.dayPillNumber, isSel && styles.dayPillNumberActive]}>
                            {d}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.dateSummary}>
                    <CalendarIcon size={15} color={home.gold} />
                    <Text style={styles.dateSummaryText} numberOfLines={1}>
                      <Text style={styles.dateSummaryStrong}>
                        {formatShortDate(draftDate)}
                      </Text>
                      {` · ${describeDistance(draftDaysLeft)}`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Kaç gün önce hatırlatalım?")}</Text>
                <View style={styles.segmented}>
                  {REMINDER_OPTIONS.map((opt) => {
                    const isSel = reminderDays === opt.days;
                    return (
                      <Pressable
                        key={opt.days}
                        accessibilityRole="button"
                        accessibilityLabel={tx("Hatırlatma: {label}", { label: tx(opt.label) })}
                        accessibilityState={{ selected: isSel }}
                        onPress={() => setReminderDays(opt.days)}
                        style={({ pressed }) => [
                          styles.optionCell,
                          isSel && styles.optionCellActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[styles.optionText, isSel && styles.optionTextActive]}
                          numberOfLines={1}
                        >
                          {tx(opt.short)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {reminderShortened && (
                  <Text style={styles.reminderHint}>{tx("Özel gün seçtiğin süreden daha yakın; seni en yakın sabah hatırlatırız.")}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{tx("Pasta / Beğeni Notları")}</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  multiline
                  placeholder={tx("Örn: Çilekli çikolatalı pastaları sever...")}
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={handleSaveOccasion}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={[home.ctaFrom, home.ctaTo]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtn}
                >
                  <BellIcon size={16} color={GOLD} />
                  <Text style={styles.saveBtnText}>{tx("Hatırlatıcıyı Kaydet")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {occasions.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={[home.cardGradFrom, home.cardGradTo]}
                style={styles.emptyIconRing}
              >
                <CalendarIcon size={30} color={home.gold} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{tx("Henüz özel gün yok")}</Text>
              <Text style={styles.emptyText}>{tx("Sevdiklerinin doğum günlerini ve yıl dönümlerini ekle, sürpriz pastanı hazırlaman için önceden hatırlatalım.")}</Text>
              {!isAdding && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsAdding(true)}
                  style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
                >
                  <PlusIcon size={16} color={CREAM} />
                  <Text style={styles.emptyCtaText}>{tx("İlk Özel Günü Ekle")}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {renderSpotlight(spotlight)}

              {rest.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{tx("Takvimdekiler")}</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  {rest.map(renderOccasionCard)}
                </View>
              )}
            </>
          )}
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    letterSpacing: 0.2,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnActive: {
    backgroundColor: 'rgba(243, 217, 166, 0.55)',
    borderColor: GOLD,
    shadowOpacity: 0,
    elevation: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },

  // Spotlight (next occasion)
  spotlight: {
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
    marginBottom: 22,
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(243, 217, 166, 0.12)',
  },
  glowTop: {
    width: 220,
    height: 220,
    top: -110,
    right: -60,
  },
  glowBottom: {
    width: 160,
    height: 160,
    bottom: -90,
    left: -50,
    backgroundColor: 'rgba(243, 217, 166, 0.07)',
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightEyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: GOLD,
  },
  spotlightDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
  },
  spotlightBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  countdownTileNumber: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    color: GOLD,
  },
  countdownTileLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255, 253, 249, 0.75)',
  },
  countdownTileToday: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: GOLD,
  },
  spotlightInfo: {
    flex: 1,
  },
  spotlightName: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: CREAM,
    letterSpacing: 0.2,
  },
  spotlightType: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(255, 253, 249, 0.88)',
  },
  spotlightDate: {
    marginTop: 4,
    fontSize: 12.5,
    color: 'rgba(255, 253, 249, 0.6)',
  },
  spotlightNotes: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    color: 'rgba(255, 253, 249, 0.78)',
  },
  spotlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  spotlightReminder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spotlightReminderText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 253, 249, 0.75)',
  },
  spotlightCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: GOLD,
  },
  spotlightCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
  },

  // List
  listSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: home.ink,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(216, 196, 168, 0.5)',
  },
  occasionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTile: {
    width: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    alignItems: 'center',
  },
  dateTileStrip: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 3,
    backgroundColor: home.ctaFrom,
  },
  dateTileMonth: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: GOLD,
  },
  dateTileDay: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: home.ink,
    paddingBottom: 2,
  },
  cardInfo: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardPerson: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: home.ink,
  },
  relChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
  },
  relChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: home.gold,
  },
  cardType: {
    marginTop: 3,
    fontSize: 12.5,
    color: home.body,
  },
  reminderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderText: {
    fontSize: 12,
    color: home.body,
    fontWeight: '500',
  },
  reminderTextSoon: {
    color: '#C2410C',
    fontWeight: '700',
  },
  countdownPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
  countdownPillSoon: {
    backgroundColor: '#FFF1E0',
    borderColor: '#FDBA74',
  },
  countdownPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: home.ink,
  },
  countdownPillTextSoon: {
    color: '#C2410C',
  },
  notesBlock: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    backgroundColor: 'rgba(247, 243, 237, 0.9)',
  },
  notesText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    color: home.body,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: home.ctaFrom,
  },
  actionDesignText: {
    fontSize: 13,
    fontWeight: '600',
    color: CREAM,
  },
  actionDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: home.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 67, 58, 0.18)',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: home.body,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: home.ctaFrom,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: CREAM,
  },

  // Form
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  formHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(243, 217, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: home.ink,
  },
  formSubtitle: {
    fontSize: 11.5,
    color: home.muted,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: home.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(247, 243, 237, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: home.ink,
  },
  notesInput: {
    minHeight: 70,
  },
  dateCard: {
    backgroundColor: 'rgba(247, 243, 237, 0.75)',
    borderRadius: 16,
    padding: 6,
  },
  optionGrid: {
    gap: 2,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 2,
  },
  optionCell: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCellActive: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    color: home.body,
  },
  optionTextActive: {
    color: CREAM,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(247, 243, 237, 0.75)',
  },
  dateDivider: {
    height: 1,
    backgroundColor: 'rgba(216, 196, 168, 0.4)',
    marginVertical: 6,
    marginHorizontal: 6,
  },
  dayStrip: {
    gap: DAY_PILL_GAP,
    paddingVertical: 2,
  },
  dayPill: {
    width: DAY_PILL_WIDTH,
    height: DAY_PILL_WIDTH,
    borderRadius: DAY_PILL_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
  },
  dayPillNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: home.body,
  },
  dayPillNumberActive: {
    color: CREAM,
    fontWeight: '700',
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  dateSummaryText: {
    flex: 1,
    fontSize: 12.5,
    color: home.body,
  },
  dateSummaryStrong: {
    fontWeight: '700',
    color: home.ink,
  },
  reminderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 217, 166, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.25)',
  },
  reminderPreviewText: {
    flex: 1,
    fontSize: 12.5,
    color: home.body,
  },
  reminderPreviewStrong: {
    fontWeight: '700',
    color: home.ink,
  },
  reminderHint: {
    marginTop: 6,
    fontSize: 11.5,
    color: home.muted,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(247, 243, 237, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
  },
  chipActive: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
  },
  chipText: {
    fontSize: 12.5,
    color: home.ink,
    fontWeight: '500',
  },
  chipTextActive: {
    color: CREAM,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 25,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: CREAM,
  },
});
