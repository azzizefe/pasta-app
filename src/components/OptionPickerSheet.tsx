import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BottomSheet from './BottomSheet';
import { home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

export type PickerOption = { label: string; value: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selected: number | null;
  /** null means "no preference". */
  onSelect: (value: number | null) => void;
};

/** A sheet of pill buttons for picking one number, plus a "no preference" choice. */
export default function OptionPickerSheet({ visible, onClose, title, options, selected, onSelect }: Props) {
  useTx();

  const pill = (label: string, value: number | null) => {
    const isSelected = value === selected;
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onSelect(value)}
        style={({ pressed }) => [styles.pill, isSelected && styles.pillSelected, pressed && styles.pillPressed]}
      >
        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.grid}>
        {options.map((o) => pill(o.label, o.value))}
        {pill(tx('Fark etmez'), null)}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  pill: {
    minWidth: 92,
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    borderColor: '#C69234',
    backgroundColor: '#FFF6E3',
  },
  pillPressed: {
    backgroundColor: home.card,
  },
  pillText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: home.ink,
  },
  pillTextSelected: {
    color: home.gold,
    fontWeight: '800',
  },
});
