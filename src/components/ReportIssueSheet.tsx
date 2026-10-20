import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import InfoSheet, { sheetStyles } from './InfoSheet';
import { AlertCircleIcon, MailIcon } from './Icons';
import { APP_VERSION, SUPPORT_EMAIL, buildSupportMailto, getDeviceLabel } from '../config/app';
import { home } from '../theme/theme';

const CATEGORIES = [
  'Görsel Üretimi',
  'Krediler & Ödeme',
  'Hesap & Giriş',
  'Hatırlatıcılar',
  'Diğer',
] as const;

type Category = (typeof CATEGORIES)[number];

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ReportIssueSheet({ visible, onClose }: Props) {
  const [category, setCategory] = useState<Category>('Görsel Üretimi');
  const [description, setDescription] = useState('');

  const trimmed = description.trim();
  const canSend = trimmed.length >= MIN_LENGTH;
  const deviceLabel = getDeviceLabel();

  const handleSend = async () => {
    if (!canSend) return;

    const subject = `[Lumière Sucrée] Sorun Bildirimi – ${category}`;
    const body = [
      trimmed,
      '',
      '———',
      `Kategori: ${category}`,
      `Cihaz: ${deviceLabel}`,
      `Uygulama Sürümü: ${APP_VERSION}`,
    ].join('\n');

    try {
      await Linking.openURL(buildSupportMailto(subject, body));
      setDescription('');
      onClose();
    } catch {
      Alert.alert(
        'E-posta Uygulaması Açılamadı',
        `Sorununu bize doğrudan ${SUPPORT_EMAIL} adresine yazarak iletebilirsin.`,
      );
    }
  };

  return (
    <InfoSheet visible={visible} title="Sorun Bildir" subtitle="Ekibimize doğrudan ulaş" onClose={onClose}>
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <AlertCircleIcon size={22} color={home.gold} />
        </View>
        <Text style={styles.introText}>
          Bir şeyler ters mi gitti? Ne olduğunu birkaç cümleyle anlat; sorunu birlikte
          hızlıca çözelim.
        </Text>
      </View>

      <Text style={sheetStyles.sectionLabel}>KONU</Text>
      <View style={styles.chipWrap}>
        {CATEGORIES.map((c) => {
          const isActive = c === category;
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setCategory(c)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={sheetStyles.sectionLabel}>NE OLDU?</Text>
      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          multiline
          maxLength={MAX_LENGTH}
          value={description}
          onChangeText={setDescription}
          placeholder="Örn: Düğün pastası oluştururken görsel yüklenmedi ve ekran boş kaldı..."
          placeholderTextColor="rgba(110, 85, 55, 0.45)"
          textAlignVertical="top"
        />
        <Text style={styles.counter}>
          {description.length}/{MAX_LENGTH}
        </Text>
      </View>

      <View style={styles.deviceNote}>
        <Text style={styles.deviceNoteText}>
          E-postana otomatik eklenecek: <Text style={styles.deviceNoteBold}>{deviceLabel}</Text> ·
          Sürüm <Text style={styles.deviceNoteBold}>{APP_VERSION}</Text>
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        disabled={!canSend}
        onPress={handleSend}
        style={({ pressed }) => [styles.sendWrap, !canSend && styles.sendDisabled, pressed && sheetStyles.pressed]}
      >
        <LinearGradient
          colors={[home.ctaFrom, home.ctaTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sheetStyles.primaryBtn}
        >
          <MailIcon size={18} color={home.accentGold} />
          <Text style={sheetStyles.primaryBtnText}>E-posta ile Gönder</Text>
        </LinearGradient>
      </Pressable>

      <Text style={styles.footnote}>
        {canSend
          ? `Gönder'e dokununca e-posta uygulaman hazır bir mesajla açılır.`
          : `Göndermek için en az ${MIN_LENGTH} karakter yaz.`}
      </Text>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(243, 217, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: home.body,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  chipActive: {
    backgroundColor: home.ctaFrom,
    borderColor: home.ctaFrom,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: home.ink,
  },
  chipTextActive: {
    color: '#FFFDF9',
    fontWeight: '600',
  },
  inputCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 14,
  },
  input: {
    minHeight: 130,
    fontSize: 14.5,
    lineHeight: 21,
    color: home.ink,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 11.5,
    color: home.muted,
  },
  deviceNote: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 217, 166, 0.22)',
  },
  deviceNoteText: {
    fontSize: 12,
    color: home.body,
  },
  deviceNoteBold: {
    fontWeight: '700',
    color: home.ink,
  },
  sendWrap: {
    marginTop: 18,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sendDisabled: {
    opacity: 0.45,
  },
  footnote: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: home.muted,
  },
});
