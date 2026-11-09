import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import BottomSheet from './BottomSheet';
import { CheckIcon, ChevronRightIcon } from './Icons';
import { type CakeKind } from '../screens/CakeBuilderScreen';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

export type CakeType = {
  kind: CakeKind;
  title: string;
  /** Short name for chips. */
  short: string;
  subtitle: string;
  image: React.ComponentProps<typeof Image>['source'];
};

export const CAKE_TYPES: CakeType[] = [
  {
    kind: 'wedding',
    title: 'Düğün Pastası',
    short: 'Düğün',
    subtitle: 'Katlı, zarif ve göz alıcı',
    image: require('../../assets/wedding-cake.png'),
  },
  {
    kind: 'engagement',
    title: 'Nişan Pastası',
    short: 'Nişan',
    subtitle: 'Romantik çiçekler ve pudra tonlar',
    image: require('../../assets/engagement-cake.png'),
  },
  {
    kind: 'birthday',
    title: 'Doğum Günü Pastası',
    short: 'Doğum Günü',
    subtitle: 'Neşeli, şık ve unutulmaz',
    image: require('../../assets/birthday-cake.png'),
  },
  {
    kind: 'custom',
    title: 'Özel Gün Pastası',
    short: 'Özel',
    subtitle: 'Yıl dönümü, mezuniyet ve daha fazlası',
    image: require('../../assets/custom-cake.png'),
  },
];

export function getCakeType(kind: CakeKind) {
  return CAKE_TYPES.find((t) => t.kind === kind) ?? CAKE_TYPES[0];
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: CakeKind) => void;
  selected?: CakeKind;
};

/** Bottom sheet that asks which kind of cake to design. */
export default function CakeTypeSheet({ visible, onClose, onSelect, selected }: Props) {
  useTx();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tx('Hangi pastayı tasarlayalım?')}
      subtitle={tx('Bir tür seçin, gerisini birlikte tasarlayalım.')}
    >
      {CAKE_TYPES.map((option) => {
        const isSelected = option.kind === selected;
        return (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityLabel={tx(option.title)}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.kind)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}
          >
            <View style={styles.thumb}>
              <Image source={option.image} style={styles.thumbImage} contentFit="contain" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{tx(option.title)}</Text>
              <Text style={styles.optionSubtitle}>{tx(option.subtitle)}</Text>
            </View>
            {isSelected ? (
              <View style={styles.check}>
                <CheckIcon size={14} color="#FFFDF9" />
              </View>
            ) : (
              <ChevronRightIcon size={18} color={home.muted} />
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 10,
    paddingRight: 14,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#D8B270',
    backgroundColor: '#FFFAF0',
  },
  optionPressed: {
    backgroundColor: home.card,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#FBF3E3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: 52,
    height: 52,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fonts.display,
    fontSize: 16.5,
    lineHeight: 22,
    color: home.ink,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: home.body,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C69234',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
