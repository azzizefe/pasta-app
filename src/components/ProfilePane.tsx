import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import {
  AlertCircleIcon,
  BellIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CoinsIcon,
  HelpCircleIcon,
  ImageIcon,
  InfoIcon,
  LogOutIcon,
  MailIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  TrashIcon,
  UserIcon,
} from './Icons';
import { AppleIcon, GoogleIcon } from './BrandIcons';
import { ShineSweep } from './motion';
import AboutSheet from './AboutSheet';
import HelpCenterSheet from './HelpCenterSheet';
import PrivacyCenterSheet from './PrivacyCenterSheet';
import ReportIssueSheet from './ReportIssueSheet';
import { CREDITS_PER_GENERATION, useCredits } from '../context/CreditsContext';
import {
  areNotificationsEnabled,
  sendTestNotification,
  setNotificationsEnabled,
} from '../services/notificationService';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

/** Masks the middle of the email local-part with asterisks (e.g. ef****a7@gmail.com). */
function maskEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  const trimmed = rawEmail.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) return trimmed;

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex); // includes '@'

  if (local.length <= 2) {
    return `${local[0] || ''}****${domain}`;
  }
  if (local.length <= 4) {
    return `${local[0]}****${local[local.length - 1]}${domain}`;
  }

  const prefix = local.slice(0, 2);
  const suffix = local.slice(-2);
  return `${prefix}****${suffix}${domain}`;
}

type RowProps = {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
};

/** One tappable settings row inside the account card. */
function Row({ icon, label, subtitle, value, onPress, isLast }: RowProps) {
  useTx();
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
      <View style={styles.rowIconBg}>{icon}</View>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
      <ChevronRightIcon size={18} color={home.muted} />
    </Pressable>
  );
}

type AppSheet = 'report' | 'help' | 'privacy' | 'about';

type Props = {
  name: string;
  email: string;
  authProvider?: 'apple' | 'google' | null;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onOpenCalendar?: () => void;
  onUpdateName?: (newName: string) => void;
};

/** Account tab: identity, credits, legal links, sign out, and account deletion. */
export default function ProfilePane({
  name,
  email,
  authProvider,
  onPrivacyPolicy,
  onTermsOfUse,
  onSignOut,
  onDeleteAccount,
  onOpenCalendar,
  onUpdateName,
}: Props) {
  useTx();
  const { credits, openPurchaseModal } = useCredits();
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<AppSheet | null>(null);
  const insets = useSafeAreaInsets();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userName, setUserName] = useState(name);
  const [editName, setEditName] = useState(name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [inspirationEnabled, setInspirationEnabled] = useState(true);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [resolvedProvider, setResolvedProvider] = useState<'apple' | 'google' | null>(
    authProvider || null
  );

  useEffect(() => {
    if (authProvider) {
      setResolvedProvider(authProvider);
      return;
    }
    AsyncStorage.getItem('@lumiere_auth_session_v1')
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.provider === 'google' || parsed?.provider === 'apple') {
              setResolvedProvider(parsed.provider);
              return;
            }
          } catch {}
        }
        if (email) {
          const lower = email.toLowerCase();
          if (lower.includes('privaterelay.appleid.com') || lower.includes('apple')) {
            setResolvedProvider('apple');
          } else if (lower.includes('@gmail.com') || lower.includes('google')) {
            setResolvedProvider('google');
          }
        }
      })
      .catch(() => {});
  }, [authProvider, email]);

  // Sync prop name
  useEffect(() => {
    setUserName(name);
    setEditName(name);
  }, [name]);

  // Load custom name and notification setting
  useEffect(() => {
    async function loadPreferences() {
      try {
        const storedName = await AsyncStorage.getItem('@lumiere_user_custom_name');
        if (storedName) {
          setUserName(storedName);
          setEditName(storedName);
        }
        const notifStatus = await areNotificationsEnabled();
        setNotificationsEnabledState(notifStatus);
        const storedInspiration = await AsyncStorage.getItem('@lumiere_notif_inspiration_v1');
        if (storedInspiration !== null) {
          setInspirationEnabled(storedInspiration === 'true');
        }
      } catch (err) {
        console.warn('Tercihler yüklenemedi:', err);
      }
    }
    loadPreferences();
  }, []);

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showAlert(tx("Eksik Bilgi"), tx("Kullanıcı adı boş bırakılamaz."));
      return;
    }
    setIsSavingName(true);
    try {
      await AsyncStorage.setItem('@lumiere_user_custom_name', trimmed);
      const rawSession = await AsyncStorage.getItem('@lumiere_auth_session_v1');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed?.user) {
          parsed.user.name = trimmed;
          await AsyncStorage.setItem('@lumiere_auth_session_v1', JSON.stringify(parsed));
        }
      }
      setUserName(trimmed);
      onUpdateName?.(trimmed);
      showAlert(tx("Başarılı ✨"), tx("Kullanıcı adınız güncellendi."));
    } catch (err) {
      showAlert(tx("Hata"), tx("Kullanıcı adı güncellenemedi."));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleToggleNotifications = async (val: boolean) => {
    setNotificationsEnabledState(val);
    const success = await setNotificationsEnabled(val);
    if (!success && val) {
      setNotificationsEnabledState(false);
      showAlert(tx("Bildirim İzni"), tx("Cihaz ayarlarından bildirimlere izin vermeniz gerekebilir."));
    }
  };

  const handleToggleInspiration = async (val: boolean) => {
    setInspirationEnabled(val);
    try {
      await AsyncStorage.setItem('@lumiere_notif_inspiration_v1', val ? 'true' : 'false');
    } catch (err) {
      console.warn('İlham tercihi kaydedilemedi:', err);
    }
  };

  const handleSendTest = async () => {
    if (isTestingNotification) return;
    setIsTestingNotification(true);
    try {
      const ok = await sendTestNotification(userName || 'Pastasever');
      if (ok) {
        showAlert(
          tx("Bildirim Gönderildi ✨"),
          tx("Birkaç saniye içinde cihazınıza örnek bir bildirim ulaşacaktır.")
        );
      } else {
        showAlert(
          tx("Bildirim İzni Gerekli"),
          tx("Bildirim gönderebilmek için cihazınızın ayarlarından Lumière Sucrée uygulamasına bildirim izni vermelisiniz.")
        );
      }
    } catch {
      showAlert(tx("Hata"), tx("Test bildirimi gönderilemedi."));
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleOpenNotificationSettings = async () => {
    try {
      if (Platform.OS !== 'web' && Linking.openSettings) {
        await Linking.openSettings();
      } else {
        showAlert(
          tx("Bildirim Ayarları"),
          tx("Cihazınızın Ayarlar menüsünden uygulamayı bularak bildirim izinlerini yönetebilirsiniz.")
        );
      }
    } catch (err) {
      console.warn('Ayarlar açılamadı:', err);
      showAlert(
        tx("Bildirim Ayarları"),
        tx("Cihazınızın Ayarlar menüsünden uygulamayı bularak bildirim izinlerini açabilirsiniz.")
      );
    }
  };

  const handleOpenPermissionsSettings = async () => {
    try {
      if (Platform.OS !== 'web' && Linking.openSettings) {
        await Linking.openSettings();
      } else {
        showAlert(
          tx("Uygulama İzinleri"),
          tx("Cihazınızın Ayarlar > Lumière Sucrée menüsünden bildirim, kamera ve fotoğraf erişim izinlerinizi yönetebilirsiniz.")
        );
      }
    } catch (err) {
      console.warn('Ayarlar açılamadı:', err);
      showAlert(
        tx("Uygulama İzinleri"),
        tx("Cihazınızın Ayarlar menüsünden uygulamayı bularak izinleri yönetebilirsiniz.")
      );
    }
  };

  // Kayıtlı profil fotoğrafını yükle
  useEffect(() => {
    async function loadAvatar() {
      try {
        const stored = await AsyncStorage.getItem('@lumiere_profile_avatar_v1');
        if (stored) {
          setAvatarUri(stored);
        }
      } catch (err) {
        console.warn('Profil fotoğrafı yüklenemedi:', err);
      }
    }
    loadAvatar();
  }, []);

  const handlePickGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          tx("Galeri İzni Gerekli"),
          tx("Profil fotoğrafı seçebilmek için fotoğraf galerisi erişimine izin vermelisiniz.")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem('@lumiere_profile_avatar_v1', uri);
        setIsPhotoModalOpen(false);
      }
    } catch (err: any) {
      showAlert(tx("Hata"), tx("Fotoğraf seçilemedi."));
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          tx("Kamera İzni Gerekli"),
          tx("Profil fotoğrafı çekebilmek için kamera erişimine izin vermelisiniz.")
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem('@lumiere_profile_avatar_v1', uri);
        setIsPhotoModalOpen(false);
      }
    } catch (err: any) {
      showAlert(tx("Hata"), tx("Fotoğraf çekilemedi."));
    }
  }, []);

  const handleRemovePhoto = useCallback(async () => {
    setAvatarUri(null);
    try {
      await AsyncStorage.removeItem('@lumiere_profile_avatar_v1');
    } catch (err) {
      console.warn('Profil fotoğrafı silinemedi:', err);
    }
    setIsPhotoModalOpen(false);
  }, []);

  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // iOS can't present a modal while another is still dismissing, so wait for the slide-out.
  const switchSheet = useCallback((next: AppSheet) => {
    setActiveSheet(null);
    setTimeout(() => setActiveSheet(next), 450);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    showAlert(
      tx("Hesabınızı Silmek İstediğinize Emin Misiniz?"),
      tx("Bu işlem kayıtlı tüm pastalarınızı, özel günlerinizi ve kredi bakiyenizi kalıcı olarak sıfırlar."),
      [
        { text: tx("Vazgeç"), style: 'cancel' },
        { text: tx("Evet, Hesabımı Sil"), style: 'destructive', onPress: onDeleteAccount },
      ],
    );
  }, [onDeleteAccount]);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Profil")}
          onPress={() => {
            setEditName(userName);
            setIsProfileModalOpen(true);
          }}
          style={({ pressed }) => [styles.avatarPressable, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={['#F6E2B8', '#C99A4B', '#F3D9A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage as any}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.avatarInitial}>{(userName || name).charAt(0)}</Text>
              )}
            </View>
          </LinearGradient>
        </Pressable>
        <Text style={styles.name}>{userName || name}</Text>
        <View style={styles.memberBadge}>
          <SparkleIcon size={10} color={home.accentGold} />
          <Text style={styles.memberBadgeText}>{tx("Lumière Atelier")}</Text>
        </View>
      </View>

      {/* Tasarım & Kredilerim Bölümü */}
      <Text style={styles.sectionLabel}>{tx("BAKİYE & KREDİLER")}</Text>
      <View style={styles.creditCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Kredi detayları ve satın alma")}
          onPress={openPurchaseModal}
          style={styles.creditCardBody}
        >
          {/* Kart Başlığı & Üretim Bilgisi */}
          <View style={styles.creditHeaderRow}>
            <View style={styles.creditHeaderLeft}>
              <View style={styles.creditIconBg}>
                <CoinsIcon size={17} color={home.accentGold} />
              </View>
              <Text style={styles.creditTitle} numberOfLines={1}>{tx("Tasarım Bakiyesi")}</Text>
            </View>

            <View style={styles.creditBadge}>
              <SparkleIcon size={10} color={home.accentGold} />
              <Text style={styles.creditBadgeText}>{tx("1 Tasarım = {CREDITS_PER_GENERATION} Kredi", { CREDITS_PER_GENERATION })}</Text>
            </View>
          </View>

          {/* İkili Metrik - Kafa Karışıklığını Önleyen Net Gösterge */}
          <View style={styles.creditDualMetricBox}>
            <View style={styles.creditMetricCol}>
              <View style={styles.metricNumberWrap}>
                <Text style={styles.metricNumber}>{credits}</Text>
                <Text style={styles.metricUnit}>{tx("Kredi")}</Text>
              </View>
              <Text style={styles.metricLabel}>{tx("Mevcut Bakiyeniz")}</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.creditMetricCol}>
              <View style={styles.metricNumberWrap}>
                <Text style={[styles.metricNumber, { color: home.ctaFrom }]}>
                  {Math.floor(credits / CREDITS_PER_GENERATION)}
                </Text>
                <Text style={styles.metricUnit}>{tx("Adet")}</Text>
              </View>
              <Text style={styles.metricLabel}>{tx("Pasta Tasarım Hakkı")}</Text>
            </View>
          </View>
        </Pressable>

        {/* Kredi Yükleme Butonu */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Kredi Yükle")}
          onPress={openPurchaseModal}
          android_ripple={{ color: '#FDF6E9' }}
          style={({ pressed }) => [
            styles.buyCreditsButton,
            pressed && styles.buyCreditsButtonPressed,
          ]}
        >
          <LinearGradient
            colors={['#2E1E14', '#1C1109']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buyCreditsGradient}
          >
            <ShineSweep initialDelay={1500} interval={4200} />
            <PlusIcon size={16} color="#F5E6CC" strokeWidth={2.4} />
            <Text style={styles.buyCreditsButtonText}>{tx("Kredi Yükle")}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>{tx("HESAP")}</Text>
      <View style={styles.card}>
        <Row
          icon={<UserIcon size={19} color={home.accentGold} />}
          label={tx("Profil & Hesap")}
          subtitle={tx("Kullanıcı adı, e-posta ve bildirimler")}
          onPress={() => {
            setEditName(userName);
            setIsProfileModalOpen(true);
          }}
          isLast
        />
      </View>

      <Text style={styles.sectionLabel}>{tx("UYGULAMA")}</Text>
      <View style={styles.card}>
        <Row
          icon={<AlertCircleIcon size={18} color={home.ink} />}
          label={tx("Sorun Bildir")}
          subtitle={tx("Geri bildirim ve hata bildirimi")}
          onPress={() => setActiveSheet('report')}
        />
        <Row
          icon={<HelpCircleIcon size={18} color={home.ink} />}
          label={tx("Yardım Merkezi")}
          subtitle={tx("Sıkça sorulan sorular & rehber")}
          onPress={() => setActiveSheet('help')}
        />
        <Row
          icon={<ShieldIcon size={18} color={home.ink} />}
          label={tx("Gizlilik Merkezi")}
          subtitle={tx("Kişisel veriler ve güvenlik")}
          onPress={() => setActiveSheet('privacy')}
        />
        <Row
          icon={<InfoIcon size={18} color={home.ink} />}
          label={tx("Hakkında")}
          subtitle={tx("Lumière Sucrée • Haute Pâtisserie")}
          onPress={() => setActiveSheet('about')}
          isLast
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tx("Çıkış Yap")}
        onPress={onSignOut}
        android_ripple={{ color: home.divider }}
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
      >
        <LogOutIcon size={18} color={home.ink} />
        <Text style={styles.signOutLabel}>{tx("Çıkış Yap")}</Text>
      </Pressable>

      {/* Profil Detay ve Ayarlar Sayfası (Tam Sayfa) */}
      <Modal
        visible={isProfileModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <LinearGradient
            colors={[home.washTop, home.washMid, home.washEnd]}
            locations={[0, 0.24, 0.58]}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Geri")}
              onPress={() => setIsProfileModalOpen(false)}
              hitSlop={10}
              style={styles.circleBtn}
            >
              <ChevronLeftIcon size={20} color={home.ink} strokeWidth={2} />
            </Pressable>

            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalHeaderTitle}>{tx("Profil")}</Text>
            </View>

            <View style={styles.modalHeaderPlaceholder} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[
              styles.modalScrollContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 36 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Profil Fotoğrafı ve Hero */}
            <View style={styles.profileHeroSection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Profil fotoğrafı değiştir")}
                onPress={() => setIsPhotoModalOpen(true)}
                style={styles.avatarPressable}
              >
                <LinearGradient
                  colors={['#F6E2B8', '#C99A4B', '#F3D9A6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRing}
                >
                  <View style={styles.avatar}>
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage as any}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <Text style={styles.avatarInitial}>{userName.charAt(0) || tx("A")}</Text>
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.avatarCameraBadge}>
                  <CameraIcon size={12} color="#FFFDF9" strokeWidth={2.2} />
                </View>
              </Pressable>
              <Text style={styles.profileHeroSub}>{tx("Fotoğrafa dokunarak değiştirebilirsiniz")}</Text>
            </View>

            {/* 1. Kullanıcı Adı (İsterse değiştirebilir) */}
            <Text style={styles.fieldLabel}>{tx("KULLANICI ADI")}</Text>
            <View style={styles.fieldCard}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={tx("Kullanıcı Adı")}
                  placeholderTextColor={home.muted}
                  autoCapitalize="words"
                  maxLength={35}
                />
                {editName.trim() !== userName && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tx("Adı Kaydet")}
                    onPress={handleSaveName}
                    disabled={isSavingName}
                    style={({ pressed }) => [
                      styles.inlineSaveBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <CheckIcon size={14} color="#FFFDF9" strokeWidth={2.4} />
                    <Text style={styles.inlineSaveBtnText}>{tx("Kaydet")}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* 2. E-posta & Bağlı Hesap */}
            <Text style={styles.fieldLabel}>{tx("E-POSTA")}</Text>
            <View style={styles.fieldCard}>
              {/* E-posta Satırı */}
              <View style={styles.fieldCardRow}>
                <View style={styles.fieldCardLeftGroup}>
                  <MailIcon size={18} color={home.accentGold} />
                  <Text style={styles.fieldCardLabel}>{tx("E-posta")}</Text>
                </View>
                <Text style={styles.fieldCardValue} numberOfLines={1}>
                  {maskEmail(email) || '—'}
                </Text>
              </View>

              {/* Sağlayıcı Satırı (Google veya Apple ile bağlandıysa) */}
              {resolvedProvider && (
                <>
                  <View style={styles.fieldCardDivider} />
                  <View style={styles.fieldCardRow}>
                    <View style={styles.fieldCardLeftGroup}>
                      {resolvedProvider === 'google' ? (
                        <GoogleIcon size={18} />
                      ) : (
                        <AppleIcon size={18} color={home.ink} />
                      )}
                      <Text style={styles.fieldCardLabel}>
                        {resolvedProvider === 'google' ? tx("Google") : tx("Apple")}
                      </Text>
                    </View>
                    <Text style={styles.fieldCardValue}>{tx("Bağlandı")}</Text>
                  </View>
                </>
              )}
            </View>

            {/* 3. Uygulama: Bildirimler */}
            <Text style={styles.fieldLabel}>{tx("UYGULAMA")}</Text>
            <View style={styles.fieldCard}>
              {/* Bildirimler Seçeneği */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Bildirim Ayarları")}
                onPress={handleOpenNotificationSettings}
                android_ripple={{ color: home.divider }}
                style={({ pressed }) => [
                  styles.fieldCardInnerPressable,
                  pressed && styles.fieldCardRowPressed,
                ]}
              >
                <View style={styles.fieldCardRow}>
                  <View style={styles.fieldCardLeftGroup}>
                    <BellIcon size={18} color={home.accentGold} />
                    <Text style={styles.fieldCardLabel}>{tx("Bildirimler")}</Text>
                  </View>
                  <ChevronRightIcon size={18} color={home.muted} />
                </View>
              </Pressable>

              <View style={styles.fieldCardDivider} />

              {/* İzinler Seçeneği */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Uygulama İzinleri")}
                onPress={handleOpenPermissionsSettings}
                android_ripple={{ color: home.divider }}
                style={({ pressed }) => [
                  styles.fieldCardInnerPressable,
                  pressed && styles.fieldCardRowPressed,
                ]}
              >
                <View style={styles.fieldCardRow}>
                  <View style={styles.fieldCardLeftGroup}>
                    <ShieldIcon size={18} color={home.accentGold} />
                    <Text style={styles.fieldCardLabel}>{tx("İzinler")}</Text>
                  </View>
                  <ChevronRightIcon size={18} color={home.muted} />
                </View>
              </Pressable>
            </View>
            {/* Ayırıcı ve Uyarı */}
            <View style={styles.modalSpacer} />

            {/* 4. En Altta: Hesabı Sil */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerWarning}>{tx("Hesabınızı sildiğinizde kalan tüm kredileriniz, kayıtlı pastalarınız ve verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tx("Hesabı Sil")}
                onPress={() => {
                  setIsProfileModalOpen(false);
                  handleDeleteAccount();
                }}
                android_ripple={{ color: home.dangerBg }}
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              >
                <TrashIcon size={17} color={home.danger} />
                <Text style={styles.deleteBtnLabel}>{tx("Hesabı Sil")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Profil Fotoğrafı Modalı */}
      <Modal
        visible={isPhotoModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => setIsPhotoModalOpen(false)}
          />
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <View style={styles.photoTitleRow}>
                <CameraIcon size={18} color={home.accentGold} strokeWidth={2} />
                <Text style={styles.photoModalTitle}>{tx("Profil Fotoğrafı")}</Text>
              </View>
              <Pressable
                hitSlop={10}
                style={styles.closeBtn}
                onPress={() => setIsPhotoModalOpen(false)}
              >
                <CloseIcon size={18} color={home.muted} />
              </Pressable>
            </View>

            <Text style={styles.photoModalSub}>{tx("Profilinize yeni bir görsel eklemek için bir yöntem seçin.")}</Text>

            <View style={styles.photoOptionsList}>
              <Pressable
                accessibilityRole="button"
                style={styles.photoOptionBtn}
                onPress={handlePickGallery}
              >
                <View style={styles.photoOptionIconBg}>
                  <ImageIcon size={19} color={home.accentGold} />
                </View>
                <View style={styles.photoOptionTextCol}>
                  <Text style={styles.photoOptionTitle}>{tx("Galeriden Fotoğraf Seç")}</Text>
                  <Text style={styles.photoOptionDesc}>{tx("Cihazınızdaki fotoğraflardan seçin")}</Text>
                </View>
                <ChevronRightIcon size={16} color={home.muted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={styles.photoOptionBtn}
                onPress={handleTakePhoto}
              >
                <View style={styles.photoOptionIconBg}>
                  <CameraIcon size={19} color={home.accentGold} />
                </View>
                <View style={styles.photoOptionTextCol}>
                  <Text style={styles.photoOptionTitle}>{tx("Kamera ile Çek")}</Text>
                  <Text style={styles.photoOptionDesc}>{tx("Yeni bir fotoğraf çekin")}</Text>
                </View>
                <ChevronRightIcon size={16} color={home.muted} />
              </Pressable>

              {avatarUri && (
                <Pressable
                  accessibilityRole="button"
                  style={[styles.photoOptionBtn, styles.photoOptionBtnDanger]}
                  onPress={handleRemovePhoto}
                >
                  <View style={[styles.photoOptionIconBg, styles.photoOptionIconBgDanger]}>
                    <TrashIcon size={17} color="#D9534F" />
                  </View>
                  <View style={styles.photoOptionTextCol}>
                    <Text style={[styles.photoOptionTitle, { color: '#D9534F' }]}>{tx("Mevcut Fotoğrafı Kaldır")}</Text>
                    <Text style={styles.photoOptionDesc}>{tx("Varsayılan baş harfe geri dönün")}</Text>
                  </View>
                </Pressable>
              )}
            </View>
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
  avatarPressable: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: home.ink,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: home.accentGold,
    borderWidth: 2,
    borderColor: '#FFFDF9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  name: {
    marginTop: 12,
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    color: home.ink,
    letterSpacing: 0.2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(201, 154, 75, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.28)',
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C6527',
    letterSpacing: 0.4,
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
    fontWeight: '700',
    letterSpacing: 0.8,
    color: home.muted,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.55)',
    backgroundColor: home.card,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.4)',
  },
  rowPressed: {
    backgroundColor: home.divider,
  },
  rowIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 154, 75, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIcon: {
    width: 26,
    alignItems: 'center',
  },
  rowTextCol: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  rowSubtitle: {
    fontSize: 12,
    color: home.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: 14.5,
    fontWeight: '500',
    color: home.muted,
    marginRight: 6,
  },
  signOut: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.55)',
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.3)',
    backgroundColor: home.card,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  creditCardBody: {
    width: '100%',
  },
  creditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(216, 196, 168, 0.5)',
  },
  creditHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  creditIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(243, 217, 166, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
    letterSpacing: 0.2,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 237, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A6A22',
  },
  creditDualMetricBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  creditMetricCol: {
    flex: 1,
  },
  metricNumberWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricNumber: {
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    fontWeight: '700',
    color: home.ink,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: home.muted,
  },
  metricLabel: {
    fontSize: 12,
    color: home.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(216, 196, 168, 0.6)',
    marginHorizontal: 16,
  },
  buyCreditsButton: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#2E1E14',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  buyCreditsButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buyCreditsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 8,
  },
  buyCreditsButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFDF9',
    letterSpacing: 0.3,
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
  closeBtn: {
    padding: 4,
  },
  photoModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: home.cardGradFrom,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  photoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: home.ink,
    fontFamily: fonts.display,
  },
  photoModalSub: {
    fontSize: 13,
    lineHeight: 18,
    color: home.muted,
    marginBottom: 18,
  },
  photoOptionsList: {
    gap: 10,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.45)',
  },
  photoOptionBtnDanger: {
    backgroundColor: 'rgba(254, 242, 242, 0.8)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  photoOptionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(243, 217, 166, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  photoOptionIconBgDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  photoOptionTextCol: {
    flex: 1,
  },
  photoOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: home.ink,
  },
  photoOptionDesc: {
    fontSize: 11.5,
    color: home.muted,
    marginTop: 1,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: home.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  modalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    letterSpacing: 0.2,
  },
  modalHeaderPlaceholder: {
    width: 40,
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
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileHeroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileHeroSub: {
    fontSize: 12,
    color: home.muted,
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: home.gold,
    marginBottom: 8,
    marginTop: 14,
  },
  fieldCard: {
    backgroundColor: home.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    padding: 14,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldCardDivider: {
    height: 1,
    backgroundColor: home.divider,
    marginVertical: 12,
  },
  disabledCard: {
    backgroundColor: 'rgba(247, 243, 237, 0.75)',
    borderColor: 'rgba(216, 196, 168, 0.45)',
  },
  fieldCardInnerPressable: {
    outlineWidth: 0,
  } as any,
  fieldCardRowPressed: {
    opacity: 0.65,
  },
  fieldCardPressable: {
    outlineWidth: 0,
  } as any,
  fieldCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  fieldCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  fieldCardLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  fieldCardRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldCardValue: {
    fontSize: 14.5,
    fontWeight: '500',
    color: home.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: home.ink,
    paddingVertical: 4,
  },
  inlineSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: home.ctaFrom,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  inlineSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '500',
    color: home.body,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(110, 85, 55, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: home.muted,
  },
  fieldHint: {
    fontSize: 11.5,
    color: home.muted,
    marginTop: 6,
    marginLeft: 4,
    lineHeight: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextGroup: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: home.ink,
  },
  notificationSubtitle: {
    fontSize: 11.5,
    color: home.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  modalSpacer: {
    height: 28,
  },
  dangerZone: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
  },
  dangerWarning: {
    fontSize: 11.5,
    lineHeight: 16,
    color: home.muted,
    textAlign: 'center',
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(181, 67, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(181, 67, 58, 0.25)',
  },
  deleteBtnPressed: {
    backgroundColor: 'rgba(181, 67, 58, 0.16)',
    transform: [{ scale: 0.99 }],
  },
  deleteBtnLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: home.danger,
  },
  notificationSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  notificationSettingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationSettingContent: {
    flex: 1,
  },
  notificationSettingTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: home.ink,
  },
  notificationSettingDesc: {
    fontSize: 12,
    color: home.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rowDividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: home.divider,
    marginLeft: 64,
  },
  testNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
