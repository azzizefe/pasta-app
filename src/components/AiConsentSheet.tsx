import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImageIcon, LockIcon, SparkleIcon } from './Icons';
import { PRIVACY_URL } from '../config/app';
import { useTx } from '../context/LanguageContext';
import { fonts, home } from '../theme/theme';


type Props = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

/** One-time permission sheet shown before the first request to the AI providers. */
export default function AiConsentSheet({ visible, onAccept, onDecline }: Props) {
  const insets = useSafeAreaInsets();
  const tx = useTx();
  // LanguageProvider lays the app out right-to-left for Arabic, so rows need no flipping here.
  const sent = [tx("Pasta açıklaman ve seçtiğin detaylar"), tx("Eklediysen ilham fotoğrafın")];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.iconWrap}>
              <SparkleIcon size={26} color={home.gold} />
            </View>
            <Text style={styles.title} accessibilityRole="header">{tx("Yapay zeka ile tasarım")}</Text>
            <Text style={styles.body}>{tx("Tasarımını oluşturmak için şu bilgiler şifreli bağlantıyla sunucumuz üzerinden Google’ın Gemini yapay zeka hizmetine gönderilir:")}</Text>

            <View style={styles.list}>
              {sent.map((item, i) => (
                <View key={item} style={styles.listRow}>
                  <View style={styles.listIcon}>
                    {i === 0 ? <SparkleIcon size={14} color={home.gold} /> : <ImageIcon size={14} color={home.gold} />}
                  </View>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.noteRow}>
              <LockIcon size={14} color={home.body} />
              <Text style={styles.note}>{tx("Adın, e-postan ve hesap bilgilerin gönderilmez. Google yanıt vermezse yedek olarak OpenAI kullanılabilir.")} {tx("Bu içerikler yapay zeka modellerini eğitmek için kullanılmaz.")}</Text>
            </View>

            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
              hitSlop={8}
            >
              <Text style={styles.link}>{tx("Gizlilik Politikası")}</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={onAccept}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{tx("Kabul ediyorum")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onDecline}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{tx("Vazgeç")}</Text>
          </Pressable>
          <Text style={styles.footnote}>{tx("İznini istediğin zaman Profil → Gizlilik Merkezi’nden geri alabilirsin.")}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28, 17, 9, 0.45)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 22,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 217, 166, 0.45)',
  },
  title: {
    marginTop: 14,
    fontFamily: fonts.display,
    fontSize: 24,
    color: home.ink,
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    fontSize: 14.5,
    lineHeight: 21,
    color: home.body,
  },
  list: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
    paddingVertical: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  listIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 217, 166, 0.45)',
  },
  listText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: home.ink,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
  },
  note: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: home.body,
  },
  link: {
    marginTop: 12,
    fontSize: 13.5,
    fontWeight: '700',
    color: home.gold,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  primary: {
    marginTop: 18,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.ctaTo,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  secondary: {
    marginTop: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: home.body,
  },
  pressed: {
    opacity: 0.85,
  },
  footnote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: home.muted,
    textAlign: 'center',
  },
});
