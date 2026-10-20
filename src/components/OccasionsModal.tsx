import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOccasions } from '../context/OccasionsContext';
import {
  getDaysUntilOccasion,
  getNextOccasionDate,
  OCCASION_TYPE_INFO,
  OccasionType,
  SpecialOccasion,
} from '../types/occasion';
import { CakeKind } from '../types/savedCake';
import {
  BellIcon,
  CalendarIcon,
  ChefHatIcon,
  CloseIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from './Icons';
import { fonts, home } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenBuilder: (kind: CakeKind) => void;
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
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}, ${WEEKDAYS[date.getDay()]}`;
}

function getReminderLabel(occasion: SpecialOccasion, daysLeft: number, nextDate: Date) {
  if (daysLeft <= occasion.reminderDaysBefore) return 'Hatırlatma zamanı geldi';
  const reminder = new Date(nextDate);
  reminder.setDate(reminder.getDate() - occasion.reminderDaysBefore);
  return `Hatırlatma: ${reminder.getDate()} ${MONTH_NAMES[reminder.getMonth()]}`;
}

function getCountdownLabel(daysLeft: number) {
  if (daysLeft === 0) return 'Bugün!';
  if (daysLeft === 1) return 'Yarın!';
  return `${daysLeft} gün`;
}

export default function OccasionsModal({
  visible,
  onClose,
  onOpenBuilder,
}: Props) {
  const insets = useSafeAreaInsets();
  const { occasions, upcomingOccasions, addOccasion, deleteOccasion, testNotification } =
    useOccasions();

  const [isAdding, setIsAdding] = useState(false);
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedType, setSelectedType] = useState<OccasionType>('birthday');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(15);
  const [notes, setNotes] = useState('');

  const handleSaveOccasion = async () => {
    if (!personName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen kişi adını giriniz.');
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
      reminderDaysBefore: 14,
    });

    setIsAdding(false);
    setPersonName('');
    setRelationship('');
    setNotes('');

    Alert.alert(
      'Hatırlatıcı Kuruldu ✨',
      `Tarihten tam 14 gün önce (2 hafta kala) sabah 10:00'da özel bildiriminiz gönderilecektir.`
    );
  };

  const handleSendTest = async () => {
    const success = await testNotification(personName.trim() || 'Zeynep');
    if (success) {
      Alert.alert(
        'Test Bildirimi Gönderildi 🔔',
        '2 saniye içinde ekranınızda 2 hafta öncesi hatırlatma bildirimini göreceksiniz.'
      );
    } else {
      Alert.alert(
        'Bildirim İzni Gerekli',
        'Bildirim gönderebilmek için lütfen cihazınızın ayarlarından uygulamaya bildirim izni verin.'
      );
    }
  };

  const handleDelete = (occasion: SpecialOccasion) => {
    Alert.alert(
      'Hatırlatıcıyı Sil',
      `"${occasion.title}" hatırlatıcısını silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteOccasion(occasion.id),
        },
      ]
    );
  };

  const handleDesign = (occasion: SpecialOccasion) => {
    onClose();
    onOpenBuilder(OCCASION_TYPE_INFO[occasion.type].defaultKind);
  };

  // occasions is already sorted nearest-first by the context.
  const [spotlight, ...rest] = occasions;

  const renderSpotlight = (occasion: SpecialOccasion) => {
    const typeInfo = OCCASION_TYPE_INFO[occasion.type];
    const daysLeft = getDaysUntilOccasion(occasion.month, occasion.day);
    const nextDate = getNextOccasionDate(occasion.month, occasion.day);
    const progress = Math.min(1, Math.max(0.04, (365 - daysLeft) / 365));

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
            <Text style={styles.spotlightEyebrowText}>SIRADAKİ ÖZEL GÜN</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hatırlatıcıyı sil"
            onPress={() => handleDelete(occasion)}
            hitSlop={10}
            style={styles.spotlightDelete}
          >
            <TrashIcon size={15} color="rgba(255, 253, 249, 0.7)" />
          </Pressable>
        </View>

        <View style={styles.spotlightBody}>
          <View style={styles.countdownTile}>
            {daysLeft <= 1 ? (
              <Text style={styles.countdownTileToday}>{getCountdownLabel(daysLeft)}</Text>
            ) : (
              <>
                <Text style={styles.countdownTileNumber}>{daysLeft}</Text>
                <Text style={styles.countdownTileLabel}>GÜN KALDI</Text>
              </>
            )}
          </View>

          <View style={styles.spotlightInfo}>
            <Text style={styles.spotlightName} numberOfLines={1}>
              {occasion.personName}
            </Text>
            <Text style={styles.spotlightType} numberOfLines={1}>
              {typeInfo.label}
              {occasion.relationship ? ` · ${occasion.relationship}` : ''}
            </Text>
            <Text style={styles.spotlightDate}>{formatLongDate(nextDate)}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#E9C27F', GOLD]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
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
            <Text style={styles.spotlightCtaText}>Pastasını Tasarla</Text>
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
              <Text style={styles.dateTileMonth}>{MONTH_SHORT[occasion.month - 1]}</Text>
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
              {typeInfo.label} · {WEEKDAYS[nextDate.getDay()]}
            </Text>
            <View style={styles.reminderLine}>
              <BellIcon size={12} color={isVerySoon ? '#C2410C' : home.muted} />
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
            <Text style={styles.actionDesignText}>Pastasını Tasarla</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hatırlatıcıyı sil"
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
      presentationStyle="pageSheet"
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
            accessibilityLabel="Kapat"
            onPress={onClose}
            hitSlop={10}
            style={styles.circleBtn}
          >
            <CloseIcon size={20} color={home.ink} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Özel Gün Takvimi
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {occasions.length === 0
                ? 'Sevdiklerinin günlerini kaçırma'
                : `${occasions.length} özel gün · ${upcomingOccasions.length} yaklaşan`}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isAdding ? 'Formu kapat' : 'Yeni özel gün ekle'}
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
                  <Text style={styles.formTitle}>Yeni Özel Gün</Text>
                  <Text style={styles.formSubtitle}>14 gün önceden hatırlatılırsın</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kişi Adı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Ayşe, Mehmet, Annem"
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={personName}
                  onChangeText={setPersonName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Yakınlık Derecesi (Opsiyonel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Eşim, Kardeşim, Arkadaşım"
                  placeholderTextColor="rgba(110, 85, 55, 0.45)"
                  value={relationship}
                  onChangeText={setRelationship}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Özel Gün Türü</Text>
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
                        <Text style={styles.typeIcon}>{info.icon}</Text>
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {info.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ay</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {MONTH_NAMES.map((name, idx) => {
                    const mNum = idx + 1;
                    const isSel = selectedMonth === mNum;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => setSelectedMonth(mNum)}
                        style={[styles.chip, isSel && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gün (1-31)</Text>
                <TextInput
                  style={[styles.input, styles.dayInput]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={String(selectedDay)}
                  onChangeText={(t) => {
                    const num = parseInt(t.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(num) && num >= 1 && num <= 31) {
                      setSelectedDay(num);
                    } else if (t === '') {
                      setSelectedDay(1);
                    }
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pasta / Beğeni Notları</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  multiline
                  placeholder="Örn: Çilekli çikolatalı pastaları sever..."
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
                  <Text style={styles.saveBtnText}>Hatırlatıcıyı Kaydet</Text>
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
              <Text style={styles.emptyTitle}>Henüz özel gün yok</Text>
              <Text style={styles.emptyText}>
                Sevdiklerinin doğum günlerini ve yıl dönümlerini ekle, sürpriz pastanı
                hazırlaman için 2 hafta önceden hatırlatalım.
              </Text>
              {!isAdding && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsAdding(true)}
                  style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
                >
                  <PlusIcon size={16} color={CREAM} />
                  <Text style={styles.emptyCtaText}>İlk Özel Günü Ekle</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {renderSpotlight(spotlight)}

              {rest.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Takvimdekiler</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  {rest.map(renderOccasionCard)}
                </View>
              )}
            </>
          )}

          {/* Bildirim Bilgi Şeridi */}
          <View style={styles.infoStrip}>
            <View style={styles.infoIconRing}>
              <BellIcon size={16} color={home.gold} />
            </View>
            <Text style={styles.infoText}>
              Her özel günden <Text style={styles.infoTextBold}>14 gün önce</Text> sabah
              10:00'da hatırlatılırsın.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleSendTest}
              hitSlop={6}
              style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}
            >
              <Text style={styles.testBtnText}>Test Et</Text>
            </Pressable>
          </View>
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
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: home.muted,
    fontWeight: '500',
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
  countdownTile: {
    width: 92,
    height: 92,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 217, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
  },
  countdownTileNumber: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 46,
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
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 18,
    backgroundColor: 'rgba(255, 253, 249, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
    fontSize: 11.5,
    color: home.muted,
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

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.45)',
  },
  infoIconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(243, 217, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: home.body,
  },
  infoTextBold: {
    fontWeight: '700',
    color: home.ink,
  },
  testBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: home.ink,
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
  dayInput: {
    width: 90,
    textAlign: 'center',
  },
  notesInput: {
    minHeight: 70,
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
  typeIcon: {
    fontSize: 15,
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
