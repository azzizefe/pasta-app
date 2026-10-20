import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronRightIcon, CloseIcon } from './Icons';
import { fonts, home } from '../theme/theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Full-height sliding sheet shared by the profile's "Uygulama" pages. */
export default function InfoSheet({ visible, title, subtitle, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={[home.washTop, home.washMid, home.washEnd]}
          locations={[0, 0.24, 0.58]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
          <View style={styles.headerSide} />
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <CloseIcon size={19} color={home.ink} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

type SheetRowProps = {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onPress: () => void;
  isLast?: boolean;
};

/** Tappable row used inside a SheetCard. */
export function SheetRow({ icon, label, detail, onPress, isLast }: SheetRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: home.divider }}
      style={({ pressed }) => [
        sheetStyles.row,
        !isLast && sheetStyles.rowDivider,
        pressed && sheetStyles.rowPressed,
      ]}
    >
      <View style={sheetStyles.rowIcon}>{icon}</View>
      <View style={sheetStyles.rowText}>
        <Text style={sheetStyles.rowLabel}>{label}</Text>
        {detail && <Text style={sheetStyles.rowDetail}>{detail}</Text>}
      </View>
      <ChevronRightIcon size={17} color={home.muted} />
    </Pressable>
  );
}

export const sheetStyles = StyleSheet.create({
  sectionLabel: {
    marginTop: 22,
    marginLeft: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: home.muted,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: home.divider,
  },
  rowPressed: {
    backgroundColor: home.divider,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: home.ink,
  },
  rowDetail: {
    marginTop: 2,
    fontSize: 12,
    color: home.muted,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerSide: {
    width: 40,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: home.muted,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
});
