import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import InfoSheet, { sheetStyles } from './InfoSheet';
import { ChevronDownIcon, HelpCircleIcon, MailIcon } from './Icons';
import { CREDITS_PER_GENERATION, INITIAL_CREDITS } from '../context/CreditsContext';
import { home } from '../theme/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Faq = { q: string; a: string };
type FaqGroup = { title: string; items: Faq[] };

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Krediler & Ödeme',
    items: [
      {
        q: 'Bir pasta tasarımı kaç kredi?',
        a: `Her tasarım ${CREDITS_PER_GENERATION} kredi. Yeni hesaplara hoş geldin hediyesi olarak ${INITIAL_CREDITS} kredi tanımlanır; bakiyeni Profil sekmesinden takip edebilirsin.`,
      },
      {
        q: 'Görsel oluşturulamazsa kredim ne olur?',
        a: 'Teknik bir hata yüzünden görsel üretilemezse harcanan kredi bakiyene otomatik olarak iade edilir. Ekstra bir şey yapmana gerek yok.',
      },
      {
        q: 'Satın aldığım krediler görünmüyor.',
        a: 'Kredilerim ekranının altındaki "Satın Alımları Geri Yükle" butonuna dokun. Sorun devam ederse "Sorun Bildir" üzerinden bize yaz.',
      },
      {
        q: 'Ödeme iadesi nasıl talep edilir?',
        a: 'Tüm ödemeler Apple veya Google üzerinden alınır; ödeme iadeleri ilgili mağazanın iade süreciyle talep edilir. Başarısız üretimler için ise bize yazman yeterli.',
      },
    ],
  },
  {
    title: 'Tasarım Oluşturma',
    items: [
      {
        q: 'İlham fotoğrafı ne işe yarar?',
        a: 'Davetiye, gelinlik kumaşı ya da parti teması gibi bir fotoğraf yüklediğinde yapay zeka buradaki renkleri ve desenleri pastana uyarlar. Fotoğraf tamamen isteğe bağlıdır.',
      },
      {
        q: 'Oluşan tasarımı nasıl değiştiririm?',
        a: `Sonuç ekranında "Düzenle"ye dokun ve değiştirmek istediğin detayları yaz. Her yeni görsel ${CREDITS_PER_GENERATION} kredi kullanır.`,
      },
      {
        q: 'Tasarımlarım nerede saklanıyor?',
        a: 'Oluşturduğun her tasarım Saved sekmesindeki koleksiyonuna otomatik kaydedilir. "Görseli İndir" ile fotoğraf galerine de kaydedebilirsin.',
      },
    ],
  },
  {
    title: 'Hatırlatıcılar',
    items: [
      {
        q: 'Hatırlatma bildirimi ne zaman gelir?',
        a: 'Eklediğin her özel günden 14 gün önce sabah 10:00\'da bildirim alırsın; böylece sürpriz pastanı hazırlamaya vaktin olur.',
      },
      {
        q: 'Bildirimler gelmiyor, ne yapmalıyım?',
        a: 'Cihaz ayarlarından uygulamaya bildirim izni verdiğinden emin ol. Özel Gün Takvimi\'ndeki "Test Et" butonuyla bildirimleri hemen deneyebilirsin.',
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      {
        q: 'Uygulama dilini nasıl değiştiririm?',
        a: 'Profil > Uygulama Ayarları > Uygulama Dili yolunu izleyerek Türkçe, İngilizce, Fransızca veya Arapça seçebilirsin.',
      },
      {
        q: 'Hesabımı nasıl silerim?',
        a: 'Profil sekmesinin en altındaki "Hesabı Sil" butonuna dokunup onaylaman yeterli.',
      },
    ],
  },
];

function normalize(text: string) {
  return text.toLocaleLowerCase('tr-TR');
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onContactSupport: () => void;
};

export default function HelpCenterSheet({ visible, onClose, onContactSupport }: Props) {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((f) => normalize(f.q).includes(q) || normalize(f.a).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <InfoSheet visible={visible} title="Yardım Merkezi" subtitle="Sık sorulan sorular" onClose={onClose}>
      <View style={styles.searchBox}>
        <HelpCircleIcon size={18} color={home.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Ne öğrenmek istersin?"
          placeholderTextColor="rgba(110, 85, 55, 0.5)"
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {groups.length === 0 ? (
        <View style={styles.noResult}>
          <Text style={styles.noResultTitle}>Sonuç bulunamadı</Text>
          <Text style={styles.noResultText}>
            Farklı bir kelime dene ya da aşağıdan bize doğrudan yaz.
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.title}>
            <Text style={sheetStyles.sectionLabel}>{group.title.toLocaleUpperCase('tr-TR')}</Text>
            <View style={sheetStyles.card}>
              {group.items.map((item, idx) => {
                const key = `${group.title}-${item.q}`;
                const isOpen = openKey === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => toggle(key)}
                    style={[styles.faq, idx < group.items.length - 1 && styles.faqDivider]}
                  >
                    <View style={styles.faqHead}>
                      <Text style={[styles.faqQ, isOpen && styles.faqQOpen]}>{item.q}</Text>
                      <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                        <ChevronDownIcon size={16} color={isOpen ? home.gold : home.muted} />
                      </View>
                    </View>
                    {isOpen && <Text style={styles.faqA}>{item.a}</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}

      <LinearGradient
        colors={[home.ctaFrom, home.ctaTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.contactCard}
      >
        <View style={styles.contactGlow} />
        <Text style={styles.contactTitle}>Aradığını bulamadın mı?</Text>
        <Text style={styles.contactText}>
          Ekibimize yaz, sorununu birlikte çözelim.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onContactSupport}
          style={({ pressed }) => [styles.contactBtn, pressed && sheetStyles.pressed]}
        >
          <MailIcon size={16} color={home.ink} />
          <Text style={styles.contactBtnText}>Bize Yaz</Text>
        </Pressable>
      </LinearGradient>
    </InfoSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    color: home.ink,
    outlineWidth: 0,
  },
  faq: {
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: home.divider,
  },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqQ: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
    color: home.ink,
  },
  faqQOpen: {
    color: home.gold,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 217, 166, 0.25)',
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
    backgroundColor: 'rgba(243, 217, 166, 0.5)',
  },
  faqA: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 20,
    color: home.body,
  },
  noResult: {
    marginTop: 22,
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  noResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: home.ink,
  },
  noResultText: {
    marginTop: 4,
    fontSize: 13,
    color: home.body,
    textAlign: 'center',
  },
  contactCard: {
    marginTop: 26,
    padding: 22,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  contactGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -110,
    right: -50,
    backgroundColor: 'rgba(243, 217, 166, 0.12)',
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  contactText: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255, 253, 249, 0.75)',
    textAlign: 'center',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: home.accentGold,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
  },
});
