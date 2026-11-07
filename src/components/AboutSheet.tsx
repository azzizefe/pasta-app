import React from 'react';
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../utils/alert';
import * as StoreReview from 'expo-store-review';

import InfoSheet, { SheetRow, sheetStyles } from './InfoSheet';
import { DocumentIcon, GlobeIcon, MailIcon, ShieldIcon, SparkleIcon, StarIcon } from './Icons';
import { APP_VERSION, SUPPORT_EMAIL, WEBSITE_URL, buildSupportMailto } from '../config/app';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

const APP_ICON = require('../../assets/icon.png');

type Props = {
  visible: boolean;
  onClose: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfUse: () => void;
};

export default function AboutSheet({ visible, onClose, onPrivacyPolicy, onTermsOfUse }: Props) {
  useTx();
  const handleRate = async () => {
    const available = Platform.OS !== 'web' && (await StoreReview.isAvailableAsync().catch(() => false));
    if (available) {
      await StoreReview.requestReview().catch(() => {});
    } else {
      showAlert(tx("Teşekkürler!"), tx("Değerlendirme özelliği uygulama mağazadan indirildiğinde kullanılabilir."));
    }
  };

  const handleWebsite = () => {
    Linking.openURL(WEBSITE_URL).catch(() => {});
  };

  const handleContact = () => {
    Linking.openURL(buildSupportMailto('[Lumière Sucrée] Merhaba')).catch(() => {
      showAlert(tx("E-posta Uygulaması Açılamadı"), tx("Bize {SUPPORT_EMAIL} adresinden ulaşabilirsin.", { SUPPORT_EMAIL }));
    });
  };

  return (
    <InfoSheet visible={visible} title={tx("Hakkında")} onClose={onClose}>
      <View style={styles.brand}>
        <Text style={styles.appName}>{tx("Lumière Sucrée")}</Text>
        <Text style={styles.tagline}>{tx("Hayalindeki pastayı yapay zekayla tasarla")}</Text>
        <View style={styles.versionPill}>
          <SparkleIcon size={11} color={home.gold} />
          <Text style={styles.versionText}>{tx("Sürüm {APP_VERSION}", { APP_VERSION })}</Text>
        </View>
      </View>

      <Text style={sheetStyles.sectionLabel}>{tx("BİZİ DESTEKLE")}</Text>
      <View style={sheetStyles.card}>
        <SheetRow
          icon={<StarIcon size={17} color={home.gold} />}
          label={tx("Uygulamayı Değerlendir")}
          detail={tx("Puanın daha çok pastaseverin bizi bulmasını sağlar")}
          onPress={handleRate}
        />
        <SheetRow
          icon={<GlobeIcon size={17} color={home.gold} />}
          label={tx("Web Sitesi")}
          detail={WEBSITE_URL.replace('https://', '')}
          onPress={handleWebsite}
        />
        <SheetRow
          icon={<MailIcon size={17} color={home.gold} />}
          label={tx("Bize Ulaşın")}
          detail={SUPPORT_EMAIL}
          onPress={handleContact}
          isLast
        />
      </View>

      <Text style={sheetStyles.sectionLabel}>{tx("YASAL")}</Text>
      <View style={sheetStyles.card}>
        <SheetRow
          icon={<DocumentIcon size={17} color={home.gold} />}
          label={tx("Kullanım Koşulları")}
          onPress={onTermsOfUse}
        />
        <SheetRow
          icon={<ShieldIcon size={17} color={home.gold} />}
          label={tx("Gizlilik Politikası")}
          onPress={onPrivacyPolicy}
          isLast
        />
      </View>

      <Text style={styles.footer}>{tx("© {p0} Lumière Sucrée\nSevgiyle tasarlandı", { p0: new Date().getFullYear() })}</Text>
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
  footer: {
    marginTop: 26,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: home.muted,
  },
});
