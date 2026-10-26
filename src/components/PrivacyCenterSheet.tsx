import React from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';

import InfoSheet, { SheetRow, sheetStyles } from './InfoSheet';
import {
  AlertCircleIcon,
  BellIcon,
  BookmarkIcon,
  CreditCardIcon,
  DocumentIcon,
  ImageIcon,
  LockIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
} from './Icons';
import { SUPPORT_EMAIL, buildSupportMailto } from '../config/app';
import { home } from '../theme/theme';

const DATA_PRACTICES = [
  {
    icon: UserIcon,
    title: 'Hesap bilgilerin',
    text: 'Apple veya Google ile girişte yalnızca adın ve e-posta adresin bize ulaşır. Şifrelerine hiçbir zaman erişemeyiz.',
  },
  {
    icon: ImageIcon,
    title: 'İlham fotoğrafların',
    text: 'Yüklediğin fotoğraflar ve tarif notların yalnızca tasarımını oluşturmak için şifreli bağlantıyla gönderilir; herkese açık yapay zeka modellerinin eğitiminde kullanılmaz.',
  },
  {
    icon: CreditCardIcon,
    title: 'Ödemelerin',
    text: 'Tüm satın almalar Apple ve Google tarafından işlenir. Kart numaranı veya fatura bilgilerini görmeyiz, saklamayız.',
  },
  {
    icon: BookmarkIcon,
    title: 'Cihazında kalanlar',
    text: 'Kaydettiğin tasarımlar, kredi bakiyen ve özel gün hatırlatıcıların cihazında saklanır.',
  },
  {
    icon: AlertCircleIcon,
    title: 'Hata raporları',
    text: 'Uygulamayı kararlı tutabilmek için anonim çökme raporları ve performans verileri toplanabilir.',
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
};

export default function PrivacyCenterSheet({ visible, onClose, onPrivacyPolicy, onTermsOfUse }: Props) {
  const handleNotificationSettings = () => {
    if (Platform.OS === 'web') {
      showAlert('Bildirim İzinleri', 'Bildirim izinlerini tarayıcının site ayarlarından yönetebilirsin.');
      return;
    }
    Linking.openSettings().catch(() => {
      showAlert('Ayarlar Açılamadı', 'Bildirim izinlerini cihazının Ayarlar uygulamasından yönetebilirsin.');
    });
  };

  const handleDataRequest = () => {
    Linking.openURL(
      buildSupportMailto(
        '[Lumière Sucrée] Kişisel Veri Talebi',
        'Merhaba,\n\nHesabıma ait kişisel verilerle ilgili talebim:\n(ör. verilerimin bir kopyası / verilerimin silinmesi)\n\n',
      ),
    ).catch(() => {
      showAlert('E-posta Uygulaması Açılamadı', `Talebini ${SUPPORT_EMAIL} adresine iletebilirsin.`);
    });
  };

  return (
    <InfoSheet visible={visible} title="Gizlilik Merkezi" subtitle="Verilerin üzerinde tam kontrol" onClose={onClose}>
      <LinearGradient
        colors={[home.ctaFrom, home.ctaTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlow} />
        <View style={styles.heroIcon}>
          <ShieldIcon size={30} color={home.accentGold} />
        </View>
        <Text style={styles.heroTitle}>Gizliliğin bizim için önemli</Text>
        <Text style={styles.heroText}>
          Hangi bilgiyi neden kullandığımızı açıkça anlatıyoruz. Kişisel verilerini
          satmıyor, kiralamıyor veya takas etmiyoruz.
        </Text>
        <View style={styles.heroBadge}>
          <LockIcon size={12} color={home.accentGold} />
          <Text style={styles.heroBadgeText}>Şifreli bağlantı (TLS)</Text>
        </View>
      </LinearGradient>

      <Text style={sheetStyles.sectionLabel}>NELERİ, NEDEN KULLANIYORUZ</Text>
      <View style={sheetStyles.card}>
        {DATA_PRACTICES.map(({ icon: Icon, title, text }, idx) => (
          <View
            key={title}
            style={[styles.practice, idx < DATA_PRACTICES.length - 1 && styles.practiceDivider]}
          >
            <View style={sheetStyles.rowIcon}>
              <Icon size={17} color={home.gold} />
            </View>
            <View style={styles.practiceBody}>
              <Text style={styles.practiceTitle}>{title}</Text>
              <Text style={styles.practiceText}>{text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={sheetStyles.sectionLabel}>KONTROL SENDE</Text>
      <View style={sheetStyles.card}>
        <SheetRow
          icon={<BellIcon size={17} color={home.gold} />}
          label="Bildirim İzinleri"
          detail="Hatırlatıcı bildirimlerini aç veya kapat"
          onPress={handleNotificationSettings}
        />
        <SheetRow
          icon={<MailIcon size={17} color={home.gold} />}
          label="Verilerimi Talep Et"
          detail="Verilerinin kopyasını veya silinmesini iste"
          onPress={handleDataRequest}
        />
        <SheetRow
          icon={<ShieldIcon size={17} color={home.gold} />}
          label="Gizlilik Politikası"
          onPress={onPrivacyPolicy}
        />
        <SheetRow
          icon={<DocumentIcon size={17} color={home.gold} />}
          label="Kullanım Koşulları"
          onPress={onTermsOfUse}
          isLast
        />
      </View>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderRadius: 26,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -130,
    right: -70,
    backgroundColor: 'rgba(243, 217, 166, 0.12)',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 217, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
  },
  heroTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFDF9',
    textAlign: 'center',
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 253, 249, 0.75)',
    textAlign: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 217, 166, 0.14)',
  },
  heroBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: home.accentGold,
  },
  practice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  practiceDivider: {
    borderBottomWidth: 1,
    borderBottomColor: home.divider,
  },
  practiceBody: {
    flex: 1,
    marginLeft: 12,
  },
  practiceTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: home.ink,
  },
  practiceText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: home.body,
  },
});
