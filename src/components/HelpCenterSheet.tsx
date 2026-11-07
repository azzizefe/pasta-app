import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, TextInput, UIManager, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import InfoSheet, { sheetStyles } from './InfoSheet';
import { ChevronDownIcon, HelpCircleIcon, MailIcon } from './Icons';
import {
  CREDITS_PER_GENERATION,
  CREDITS_PER_GENERATION_4K,
  INITIAL_CREDITS,
} from '../context/CreditsContext';
import { home } from '../theme/theme';
import { getTxLanguage, tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

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
        a: 'Her pasta tasarımı {credits} kredidir ve stüdyo kalitesinde 4K Ultra HD olarak üretilir. Yeni hesaplara hoş geldin hediyesi olarak {welcome} kredi tanımlanır.',
      },
      {
        q: 'Büyük paketler ne kadar avantajlı?',
        a: 'Paket büyüdükçe kredi başı fiyat düşer. Kredilerim ekranında her paketin en küçük pakete göre yüzde kaç tasarruf sağladığını ve tasarım başı fiyatını görebilirsin.',
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
        a: 'Sonuç ekranında "Düzenle"ye dokun ve değiştirmek istediğin detayları yaz. Her yeni görsel {credits} kredi kullanır.',
      },
      {
        q: 'Tasarımlarım nerede saklanıyor?',
        a: 'Oluşturduğun her tasarım Koleksiyon sekmesine otomatik kaydedilir. "Görseli İndir" ile fotoğraf galerine de kaydedebilirsin.',
      },
    ],
  },
  {
    title: 'Hatırlatıcılar',
    items: [
      {
        q: 'Hatırlatma bildirimi ne zaman gelir?',
        a: 'Özel gün eklerken ne zaman hatırlatılacağını seçersin (aynı gün, 1 gün, 3 gün, 1 hafta, 2 hafta ya da 1 ay önce); bildirim o gün sabah 10:00\'da gelir.',
      },
      {
        q: 'Bildirimler gelmiyor, ne yapmalıyım?',
        a: 'Cihaz ayarlarından uygulamaya bildirim izni verdiğinden emin ol.',
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      {
        q: 'Uygulama dilini nasıl değiştiririm?',
        a: 'Uygulamanın dili, cihazının bölge ayarına göre otomatik olarak belirlenir. Değiştirmek için cihazının Ayarlar > Genel > Dil ve Bölge bölümünü kullanabilirsin.',
      },
      {
        q: 'Hesabımı nasıl silerim?',
        a: 'Profil sekmesinin en altındaki "Hesabı Sil" butonuna dokunup onaylaman yeterli.',
      },
    ],
  },
];

function normalize(text: string) {
  return text.toLocaleLowerCase(getTxLanguage() === 'tr' ? 'tr-TR' : undefined);
}

const FAQ_VARS = { credits: CREDITS_PER_GENERATION, welcome: INITIAL_CREDITS };
const faqText = (text: string) => tx(text, FAQ_VARS);

type Props = {
  visible: boolean;
  onClose: () => void;
  onContactSupport: () => void;
};

export default function HelpCenterSheet({ visible, onClose, onContactSupport }: Props) {
  useTx();
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((f) => normalize(faqText(f.q)).includes(q) || normalize(faqText(f.a)).includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const toggle = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <InfoSheet visible={visible} title={tx("Yardım Merkezi")} subtitle={tx("Sık sorulan sorular")} onClose={onClose}>
      <View style={styles.searchBox}>
        <HelpCircleIcon size={18} color={home.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={tx("Ne öğrenmek istersin?")}
          placeholderTextColor="rgba(110, 85, 55, 0.5)"
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {groups.length === 0 ? (
        <View style={styles.noResult}>
          <Text style={styles.noResultTitle}>{tx("Sonuç bulunamadı")}</Text>
          <Text style={styles.noResultText}>{tx("Farklı bir kelime dene ya da aşağıdan bize doğrudan yaz.")}</Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.title}>
            <Text style={sheetStyles.sectionLabel}>{tx(group.title).toLocaleUpperCase(getTxLanguage() === 'tr' ? 'tr-TR' : undefined)}</Text>
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
                      <Text style={[styles.faqQ, isOpen && styles.faqQOpen]}>{faqText(item.q)}</Text>
                      <View style={[styles.chevron, isOpen && styles.chevronOpen]}>
                        <ChevronDownIcon size={16} color={isOpen ? home.gold : home.muted} />
                      </View>
                    </View>
                    {isOpen && <Text style={styles.faqA}>{faqText(item.a)}</Text>}
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
        <Text style={styles.contactTitle}>{tx("Aradığını bulamadın mı?")}</Text>
        <Text style={styles.contactText}>{tx("Ekibimize yaz, sorununu birlikte çözelim.")}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onContactSupport}
          style={({ pressed }) => [styles.contactBtn, pressed && sheetStyles.pressed]}
        >
          <MailIcon size={16} color={home.ink} />
          <Text style={styles.contactBtnText}>{tx("Bize Yaz")}</Text>
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
