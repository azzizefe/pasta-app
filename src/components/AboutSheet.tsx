import React from 'react';
import { Alert, Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';

import InfoSheet, { SheetRow, sheetStyles } from './InfoSheet';
import { DocumentIcon, GlobeIcon, MailIcon, ShieldIcon, SparkleIcon, StarIcon } from './Icons';
import { APP_VERSION, SUPPORT_EMAIL, WEBSITE_URL, buildSupportMailto } from '../config/app';
import { fonts, home } from '../theme/theme';

const APP_ICON = require('../../assets/icon.png');

type Props = {
  visible: boolean;
  onClose: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
};

export default function AboutSheet({ visible, onClose, onPrivacyPolicy, onTermsOfUse }: Props) {
  const handleRate = async () => {
    const available = Platform.OS !== 'web' && (await StoreReview.isAvailableAsync().catch(() => false));
    if (available) {
      await StoreReview.requestReview().catch(() => {});
    } else {
      Alert.alert('Teşekkürler!', 'Değerlendirme özelliği uygulama mağazadan indirildiğinde kullanılabilir.');
    }
  };

  const handleWebsite = () => {
    Linking.openURL(WEBSITE_URL).catch(() => {});
  };

  const handleContact = () => {
    Linking.openURL(buildSupportMailto('[Lumière Sucrée] Merhaba')).catch(() => {
      Alert.alert('E-posta Uygulaması Açılamadı', `Bize ${SUPPORT_EMAIL} adresinden ulaşabilirsin.`);
    });
  };

  return (
    <InfoSheet visible={visible} title="Hakkında" onClose={onClose}>
      <View style={styles.brand}>
        <View style={styles.iconFrame}>
          <Image source={APP_ICON} style={styles.icon} accessibilityIgnoresInvertColors />
        </View>
        <Text style={styles.appName}>Lumière Sucrée</Text>
        <Text style={styles.tagline}>Hayalindeki pastayı yapay zekayla tasarla</Text>
        <View style={styles.versionPill}>
          <SparkleIcon size={11} color={home.gold} />
          <Text style={styles.versionText}>Sürüm {APP_VERSION}</Text>
        </View>
      </View>

      <View style={styles.storyCard}>
        <Text style={styles.storyText}>
          Lumière Sucrée; düğün, doğum günü ve nişan gibi özel anların için hayalindeki
          pastayı dakikalar içinde görselleştirir. Seçimlerini yap, ilham fotoğrafını ekle;
          gerisini yapay zeka ve pastacılık tutkumuz halletsin.
        </Text>
      </View>

      <Text style={sheetStyles.sectionLabel}>BİZİ DESTEKLE</Text>
      <View style={sheetStyles.card}>
        <SheetRow
          icon={<StarIcon size={17} color={home.gold} />}
          label="Uygulamayı Değerlendir"
          detail="Puanın daha çok pastaseverin bizi bulmasını sağlar"
          onPress={handleRate}
        />
        <SheetRow
          icon={<GlobeIcon size={17} color={home.gold} />}
          label="Web Sitesi"
          detail={WEBSITE_URL.replace('https://', '')}
          onPress={handleWebsite}
        />
        <SheetRow
          icon={<MailIcon size={17} color={home.gold} />}
          label="Bize Ulaşın"
          detail={SUPPORT_EMAIL}
          onPress={handleContact}
          isLast
        />
      </View>

      <Text style={sheetStyles.sectionLabel}>YASAL</Text>
      <View style={sheetStyles.card}>
        <SheetRow
          icon={<DocumentIcon size={17} color={home.gold} />}
          label="Kullanım Koşulları"
          onPress={onTermsOfUse}
        />
        <SheetRow
          icon={<ShieldIcon size={17} color={home.gold} />}
          label="Gizlilik Politikası"
          onPress={onPrivacyPolicy}
          isLast
        />
      </View>

      <Text style={styles.footer}>
        © {new Date().getFullYear()} Lumière Sucrée{'\n'}Sevgiyle tasarlandı
      </Text>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  iconFrame: {
    width: 96,
    height: 96,
    borderRadius: 26,
    padding: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  icon: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  appName: {
    marginTop: 16,
    fontFamily: fonts.display,
    fontSize: 28,
    color: home.ink,
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 4,
    fontSize: 13.5,
    color: home.body,
    textAlign: 'center',
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: home.gold,
  },
  storyCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  storyText: {
    fontSize: 14,
    lineHeight: 21,
    color: home.body,
    textAlign: 'center',
  },
  footer: {
    marginTop: 26,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: home.muted,
  },
});
