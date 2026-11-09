import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from './Icons';
import { FadeInUp } from './motion';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/** Ivory sheet that rises from the bottom, with a title row and a close button. */
export default function BottomSheet({ visible, onClose, title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={tx('Kapat')}
        />
        <FadeInUp distance={48} duration={380} style={styles.sheetWrap}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={tx('Kapat')}
                hitSlop={10}
                style={styles.closeButton}
              >
                <CloseIcon size={18} color={home.ink} />
              </Pressable>
            </View>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </FadeInUp>
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
  sheetWrap: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    maxHeight: '88%',
  },
  sheet: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(59, 36, 22, 0.14)',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    color: home.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 19,
    color: home.body,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorder,
  },
});
