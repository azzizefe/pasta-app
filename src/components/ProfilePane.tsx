import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  AlertCircleIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  CoinsIcon,
  GlobeIcon,
  HelpCircleIcon,
  InfoIcon,
  LogOutIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  TrashIcon,
} from './Icons';
import { ShineSweep } from './motion';
import AboutSheet from './AboutSheet';
import HelpCenterSheet from './HelpCenterSheet';
import PrivacyCenterSheet from './PrivacyCenterSheet';
import ReportIssueSheet from './ReportIssueSheet';
import { CREDITS_PER_GENERATION, useCredits } from '../context/CreditsContext';
import { useLanguage } from '../context/LanguageContext';
import { fonts, home } from '../theme/theme';

type RowProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
};

/** One tappable settings row inside the account card. */
function Row({ icon, label, onPress, isLast }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: home.divider }}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRightIcon size={18} color={home.muted} />
    </Pressable>
  );
}

type AppSheet = 'report' | 'help' | 'privacy' | 'about';

type Props = {
  name: string;
  email: string;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onOpenCalendar?: () => void;
};

/** Account tab: identity, credits, legal links, sign out, and account deletion. */
export default function ProfilePane({
  name,
  email,
  onPrivacyPolicy,
  onTermsOfUse,
  onSignOut,
  onDeleteAccount,
  onOpenCalendar,
}: Props) {
  const { credits, openPurchaseModal } = useCredits();
  const { t, language, setLanguage, languages, currentLanguageInfo } = useLanguage();
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<AppSheet | null>(null);

  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // iOS can't present a modal while another is still dismissing, so wait for the slide-out.
  const switchSheet = useCallback((next: AppSheet) => {
    setActiveSheet(null);
    setTimeout(() => setActiveSheet(next), 450);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('profile.deleteConfirmTitle'),
      t('profile.deleteConfirmDesc'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        { text: t('profile.confirmDelete'), style: 'destructive', onPress: onDeleteAccount },
      ],
    );
  }, [onDeleteAccount, t]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identity}>
        <LinearGradient
          colors={['#F6E2B8', '#C99A4B', '#F3D9A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{name.charAt(0)}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Kredilerim Bölümü */}
      <Text style={styles.sectionLabel}>KREDİLERİM</Text>
      <View style={styles.creditCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kredi detayları ve satın alma"
          onPress={openPurchaseModal}
          style={styles.creditCardBody}
        >
          <View style={styles.creditInfo}>
            <View style={styles.creditHeaderRow}>
              <View style={styles.creditIconBg}>
                <CoinsIcon size={20} color={home.accentGold} />
              </View>
              <Text style={styles.creditTitle}>Mevcut Bakiyem</Text>
            </View>

            <View style={styles.creditNumberRow}>
              <Text style={styles.creditCount}>{credits}</Text>
              <Text style={styles.creditUnit}> Kredi</Text>
            </View>

            <Text style={styles.creditCakesText}>
              ≈ {Math.floor(credits / CREDITS_PER_GENERATION)} Pasta Fotoğrafı Üretimi
            </Text>
          </View>

          <View style={styles.creditBadge}>
            <SparkleIcon size={12} color={home.accentGold} />
            <Text style={styles.creditBadgeText}>1 Üretim = {CREDITS_PER_GENERATION} Kredi</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ek Kredi Satın Al"
          onPress={openPurchaseModal}
          android_ripple={{ color: '#FDF6E9' }}
          style={({ pressed }) => [
            styles.buyCreditsButton,
            pressed && styles.buyCreditsButtonPressed,
          ]}
        >
          <ShineSweep initialDelay={1500} interval={4200} />
          <PlusIcon size={16} color="#FDF6E9" strokeWidth={2.5} />
          <Text style={styles.buyCreditsButtonText}>Ek Kredi Satın Al</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>{t('profile.sectionSettings')}</Text>
      <View style={styles.card}>
        <Row
          icon={<GlobeIcon size={19} color={home.accentGold} />}
          label={`${t('profile.languageLabel')} (${currentLanguageInfo.flag} ${currentLanguageInfo.nativeName})`}
          onPress={() => setIsLanguageModalOpen(true)}
          isLast
        />
      </View>

      <Text style={styles.sectionLabel}>ÖZEL GÜNLER & HATIRLATICILAR</Text>
      <View style={styles.card}>
        <Row
          icon={<BellIcon size={19} color={home.accentGold} />}
          label="Özel Günlerim & Hatırlatıcı Takvim"
          onPress={onOpenCalendar ?? (() => {})}
          isLast
        />
      </View>

      <Text style={styles.sectionLabel}>UYGULAMA</Text>
      <View style={styles.card}>
        <Row
          icon={<AlertCircleIcon size={19} color={home.ink} />}
          label="Sorun Bildir"
          onPress={() => setActiveSheet('report')}
        />
        <Row
          icon={<HelpCircleIcon size={19} color={home.ink} />}
          label="Yardım Merkezi"
          onPress={() => setActiveSheet('help')}
        />
        <Row
          icon={<ShieldIcon size={19} color={home.ink} />}
          label="Gizlilik Merkezi"
          onPress={() => setActiveSheet('privacy')}
        />
        <Row
          icon={<InfoIcon size={19} color={home.ink} />}
          label="Hakkında"
          onPress={() => setActiveSheet('about')}
          isLast
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Çıkış Yap"
        onPress={onSignOut}
        android_ripple={{ color: home.divider }}
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
      >
        <LogOutIcon size={18} color={home.ink} />
        <Text style={styles.signOutLabel}>Çıkış Yap</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hesabı Sil"
        onPress={handleDeleteAccount}
        android_ripple={{ color: home.dangerBg }}
        style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
      >
        <TrashIcon size={17} color={home.danger} />
        <Text style={styles.deleteLabel}>Hesabı Sil</Text>
      </Pressable>

      {/* Dil Seçimi Modalı */}
      <Modal
        visible={isLanguageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setIsLanguageModalOpen(false)} />
          <View style={styles.languageModalCard}>
            <View style={styles.languageModalHeader}>
              <View style={styles.languageTitleRow}>
                <GlobeIcon size={18} color={home.accentGold} />
                <Text style={styles.languageModalTitle}>{t('profile.languageLabel')}</Text>
              </View>
              <Pressable
                hitSlop={10}
                style={styles.closeBtn}
                onPress={() => setIsLanguageModalOpen(false)}
              >
                <CloseIcon size={18} color={home.muted} />
              </Pressable>
            </View>

            {languages.map((lang, idx) => {
              const isSelected = lang.code === language;
              return (
                <Pressable
                  key={lang.code}
                  style={[
                    styles.langItem,
                    idx < languages.length - 1 && styles.langItemDivider,
                    isSelected && styles.langItemSelected,
                  ]}
                  onPress={() => {
                    setLanguage(lang.code);
                    setIsLanguageModalOpen(false);
                  }}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={styles.langInfo}>
                    <Text style={[styles.langNativeName, isSelected && styles.langTextActive]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={styles.langEnglishName}>{lang.name}</Text>
                  </View>
                  {isSelected && <CheckIcon size={18} color={home.gold} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <ReportIssueSheet visible={activeSheet === 'report'} onClose={closeSheet} />
      <HelpCenterSheet
        visible={activeSheet === 'help'}
        onClose={closeSheet}
        onContactSupport={() => switchSheet('report')}
      />
      <PrivacyCenterSheet
        visible={activeSheet === 'privacy'}
        onClose={closeSheet}
        onPrivacyPolicy={onPrivacyPolicy}
        onTermsOfUse={onTermsOfUse}
      />
      <AboutSheet
        visible={activeSheet === 'about'}
        onClose={closeSheet}
        onPrivacyPolicy={onPrivacyPolicy}
        onTermsOfUse={onTermsOfUse}
      />
    </ScrollView>
  );
}

const CONTENT_MAX_WIDTH = 460;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scroll: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  identity: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    shadowColor: '#9A6A22',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  avatar: {
    flex: 1,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#FFFDF9',
    backgroundColor: home.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: home.ink,
  },
  name: {
    marginTop: 14,
    fontFamily: fonts.displayMedium,
    fontSize: 21,
    color: home.ink,
  },
  email: {
    marginTop: 3,
    fontSize: 13.5,
    color: home.muted,
  },
  sectionLabel: {
    marginLeft: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: home.muted,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    overflow: 'hidden',
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: home.divider,
  },
  rowPressed: {
    backgroundColor: home.divider,
  },
  rowIcon: {
    width: 26,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: home.ink,
  },
  signOut: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
  },
  signOutPressed: {
    opacity: 0.85,
  },
  signOutLabel: {
    marginLeft: 9,
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  delete: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: home.dangerBorder,
    backgroundColor: home.dangerBg,
  },
  deletePressed: {
    opacity: 0.85,
  },
  deleteLabel: {
    marginLeft: 9,
    fontSize: 15,
    fontWeight: '600',
    color: home.danger,
  },
  creditCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: home.card,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  creditCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditInfo: {
    flex: 1,
  },
  creditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
  },
  creditNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  creditCount: {
    fontFamily: fonts.displayMedium,
    fontSize: 32,
    fontWeight: '700',
    color: home.ink,
  },
  creditUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: home.muted,
  },
  creditCakesText: {
    fontSize: 12.5,
    color: home.muted,
    marginTop: 3,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  buyCreditsButton: {
    marginTop: 16,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: home.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buyCreditsButtonPressed: {
    opacity: 0.88,
  },
  buyCreditsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FDF6E9',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 18, 12, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  languageModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: home.cardGradFrom,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  languageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: home.divider,
  },
  languageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: home.ink,
    fontFamily: fonts.display,
  },
  closeBtn: {
    padding: 4,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  langItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: home.divider,
  },
  langItemSelected: {
    backgroundColor: 'rgba(239, 224, 198, 0.35)',
  },
  langFlag: {
    fontSize: 22,
    marginRight: 14,
  },
  langInfo: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  langEnglishName: {
    fontSize: 12,
    color: home.muted,
    marginTop: 1,
  },
  langTextActive: {
    color: home.gold,
    fontWeight: '700',
  },
});
