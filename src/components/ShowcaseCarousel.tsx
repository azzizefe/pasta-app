import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChefHatIcon, SparkleIcon } from './Icons';
import { PressableScale } from './motion';
import { CakeDetails, CakeKind } from '../types/savedCake';
import { fonts, home } from '../theme/theme';

export interface ShowcaseTemplate {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  kind: CakeKind;
  image: React.ComponentProps<typeof Image>['source'];
  tint: [string, string];
  details: CakeDetails;
}

export const SHOWCASE_TEMPLATES: ShowcaseTemplate[] = [
  {
    id: 'versailles-wedding',
    title: 'Château de Versailles',
    subtitle: 'Fildişi fondan, Barok kabartma & taze frambuaz taçlandırması',
    badge: '3 Katlı · 80 Kişilik',
    kind: 'wedding',
    image: require('../../assets/wedding-cake.png'),
    tint: ['#FFFDF7', '#F2E2C4'],
    details: {
      templateTitle: 'Château de Versailles',
      guests: 80,
      tier: 3,
      shape: 'silindirik',
      flavor: 'Madagaskar Vanilyalı',
      coating: 'Pürüzsüz fondan',
      color: 'Fildişi & şampanya beyazı',
      decor: 'Gösterişli',
      fillingTags: ['Beyaz çikolata ganaj', 'Frambuaz'],
      themeTags: ['Kraliyet', 'Barok Lüks'],
      textureTags: ['İpek mat doku'],
      finishTags: ['Saten parlak'],
      metallicTags: ['24K yenilebilir altın varak'],
      decorTags: ['Barok dantel rölyef', 'Taze frambuaz tacı'],
      backgroundTags: ['Kristal avizeli salon'],
      customNotes: 'Her katta zarif Barok süslemeler ve kat aralarında taze frambuaz dizilimi.',
    },
  },
  {
    id: 'velours-birthday',
    title: 'Velours Rose & Ruban',
    subtitle: 'Kelebek kanatları, dantel krema & saten fiyonk',
    badge: 'Tek Kat Yüksek · 20 Kişilik',
    kind: 'birthday',
    image: require('../../assets/birthday-cake.png'),
    tint: ['#FFF7F8', '#F5D6DF'],
    details: {
      templateTitle: 'Velours Rose & Ruban',
      guests: 20,
      tier: 1,
      shape: 'yuvarlak yüksek kesim',
      flavor: 'Red Velvet',
      coating: 'İsviçre mereng tereyağlı krema',
      color: 'Pudra pembe & fildişi',
      decor: 'Gösterişli',
      writing: 'Joyeux Anniversaire',
      fillingTags: ['Mascarpone krema', 'Çilek'],
      themeTags: ['Romantik', 'Coquette'],
      textureTags: ['Vintage Lambeth dantel'],
      finishTags: ['Kadifemsi mat'],
      metallicTags: ['Gümüş inci draje'],
      decorTags: ['Saten kurdele fiyonk', 'Yenilebilir kelebekler'],
      backgroundTags: ['Paris kafe masası'],
      customNotes: 'Kenarlarda vintage krema sıkım danteller, gümüş inciler ve ön yüzde pudra pembe fiyonk.',
    },
  },
  {
    id: 'fleur-engagement',
    title: 'Fleur Romantique',
    subtitle: 'Dokulu krem, pudra çiçek buketleri & cipsofil tacı',
    badge: '2 Katlı · 40 Kişilik',
    kind: 'engagement',
    image: require('../../assets/engagement-cake.png'),
    tint: ['#FFF8F8', '#F9E6E8'],
    details: {
      templateTitle: 'Fleur Romantique',
      guests: 40,
      tier: 2,
      shape: 'silindirik',
      flavor: 'Vanilya & Ahududu Ganaj',
      coating: 'Dokulu buttercream & sedef parıltı',
      color: 'Kırık beyaz, pudra pembe & altın inciler',
      decor: 'Romantik',
      fillingTags: ['Beyaz çikolata ganaj', 'Frambuaz'],
      themeTags: ['Romantik', 'Pastoral Zarafet'],
      textureTags: ['Spatula dokulu'],
      finishTags: ['Sedef ışıltı'],
      metallicTags: ['Altın inci boncuklar'],
      decorTags: ['Pudra şeker çiçekler', 'Cipsofil tacı'],
      backgroundTags: ['Doğal ışıklı atölye'],
      customNotes: 'Kat aralarında ve tepede taze cipsofiller ile el yapımı pudra çiçek buketleri.',
    },
  },
  {
    id: 'couronne-custom',
    title: 'Couronne Impériale',
    subtitle: 'Altın kraliyet tacı, kapitone inci doku & varak',
    badge: '2 Katlı · 30 Kişilik',
    kind: 'custom',
    image: require('../../assets/custom-cake.png'),
    tint: ['#FFF9EC', '#F1DCAC'],
    details: {
      templateTitle: 'Couronne Impériale',
      guests: 30,
      tier: 2,
      shape: 'yüksek silindirik',
      flavor: 'Belçika Bitter Çikolatalı',
      coating: 'Fildişi şeker hamuru',
      color: 'Krem beyaz & antik altın',
      decor: 'Gösterişli',
      fillingTags: ['Antep fıstıklı pralin', 'Karamelize fındık'],
      themeTags: ['İmparatorluk', 'Couture'],
      textureTags: ['Kapitone elmas doku'],
      finishTags: ['Saten parlak'],
      metallicTags: ['Altın varak', 'Altın inci'],
      decorTags: ['Altın kraliyet tacı', 'Barok kabartma motifler'],
      backgroundTags: ['Mermer saray konsolu'],
      customNotes: 'En üstte el işçiliği altın taç figürü ve alt katta kapitone inci birleşimler.',
    },
  },
  {
    id: 'atelier-diy',
    title: 'Atelier Naked Berry',
    subtitle: 'Yarı açık rustik katmanlar, taze orman meyveleri',
    badge: '2 Katlı · 18 Kişilik',
    kind: 'diy',
    image: require('../../assets/cake.png'),
    tint: ['#FFFDF8', '#EEDBC0'],
    details: {
      templateTitle: 'Atelier Naked Berry',
      guests: 18,
      tier: 2,
      shape: 'doğal yuvarlak',
      flavor: 'Badem & Vanilyalı Pandispanya',
      coating: 'Hafif krema (naked)',
      color: 'Doğal krem & bordo meyve tonları',
      decor: 'Orta',
      fillingTags: ['Taze böğürtlen', 'Ahududu', 'Pastacı kreması'],
      themeTags: ['Rustik', 'Artisan'],
      textureTags: ['Yarı açık kek katmanları', 'Spatula dokusu'],
      finishTags: ['Doğal pudra şekeri serpmeli'],
      metallicTags: [],
      decorTags: ['Taze orman meyveleri', 'Biberiye dalları', 'İncir dilimleri'],
      backgroundTags: ['Ahşap rustik atölye masası'],
      customNotes: 'Evde hazırlamaya uygun, doğal görünümlü artisan pasta şablonu.',
    },
  },
];

interface Props {
  onSelectTemplate: (kind: CakeKind, details: CakeDetails) => void;
}

export default function ShowcaseCarousel({ onSelectTemplate }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.eyebrowRow}>
            <SparkleIcon size={12} color={home.accentGold} />
            <Text style={styles.eyebrow}>HAUTE PÂTISSERIE VİTRİNİ</Text>
          </View>
          <Text style={styles.sectionTitle}>Hazır Şablonlarla Başla</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}
      >
        {SHOWCASE_TEMPLATES.map((tpl) => (
          <PressableScale
            key={tpl.id}
            accessibilityRole="button"
            accessibilityLabel={`${tpl.title} şablonunu seç`}
            onPress={() => onSelectTemplate(tpl.kind, tpl.details)}
            scaleTo={0.97}
            contentStyle={styles.card}
          >
            <LinearGradient
              colors={tpl.tint}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.artBox}
            >
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{tpl.badge}</Text>
              </View>
              <Image
                source={tpl.image}
                accessibilityLabel={tpl.title}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </LinearGradient>

            <View style={styles.body}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {tpl.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {tpl.subtitle}
              </Text>

              <View style={styles.ctaRow}>
                <ChefHatIcon size={13} color="#FFFDF9" />
                <Text style={styles.ctaText}>Şablonu Özelleştir</Text>
              </View>
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    gap: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: home.gold,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    letterSpacing: 0.2,
  },
  scroller: {
    marginHorizontal: -20,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 14,
  },
  card: {
    width: 214,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    overflow: 'hidden',
    shadowColor: '#7B5B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  artBox: {
    height: 138,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    backgroundColor: 'rgba(58, 36, 20, 0.82)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFDF9',
    letterSpacing: 0.2,
  },
  image: {
    width: '88%',
    height: '88%',
    marginTop: 10,
  },
  body: {
    padding: 13,
    gap: 5,
  },
  cardTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15.5,
    color: home.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16.5,
    color: home.muted,
    minHeight: 33,
  },
  ctaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: home.ctaFrom,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF9',
  },
});
