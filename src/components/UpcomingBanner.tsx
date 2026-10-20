import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getDaysUntilOccasion,
  OCCASION_TYPE_INFO,
  SpecialOccasion,
} from '../types/occasion';
import { ChefHatIcon, CloseIcon } from './Icons';
import { CakeKind } from '../types/savedCake';
import { home } from '../theme/theme';

interface Props {
  occasion: SpecialOccasion;
  onOpenBuilder: (kind: CakeKind) => void;
  onOpenCalendar: () => void;
}

export default function UpcomingBanner({
  occasion,
  onOpenBuilder,
  onOpenCalendar,
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const daysLeft = getDaysUntilOccasion(occasion.month, occasion.day);
  const typeInfo = OCCASION_TYPE_INFO[occasion.type];

  const daysText =
    daysLeft === 0
      ? 'Bugün!'
      : daysLeft === 1
      ? 'Yarın!'
      : `${daysLeft} gün kaldı`;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF9F0', '#FDF2E2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onOpenCalendar}
        style={styles.inner}
      >
        <View style={styles.leftIcon}>
          <Text style={styles.emoji}>{typeInfo.icon}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.badge}>{daysText}</Text>
            <Text style={styles.dateLabel}>2 Hafta Öncesi Hatırlatma</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {occasion.personName} • {typeInfo.label}
          </Text>
          <Text style={styles.subtitle}>
            Sürpriz pasta tasarımını şimdiden hazırlayın ✨
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tasarla"
          onPress={() => onOpenBuilder(typeInfo.defaultKind)}
          style={styles.ctaBtn}
        >
          <ChefHatIcon size={14} color="#FFFDF9" />
          <Text style={styles.ctaBtnText}>Tasarla</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          onPress={() => setDismissed(true)}
          hitSlop={8}
          style={styles.closeBtn}
        >
          <CloseIcon size={14} color={home.muted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(216, 185, 140, 0.65)',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 11,
  },
  leftIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(243, 217, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B76E1A',
    backgroundColor: 'rgba(230, 160, 60, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateLabel: {
    fontSize: 10.5,
    color: home.muted,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '600',
    color: home.ink,
  },
  subtitle: {
    fontSize: 11.5,
    color: home.muted,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.4)',
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  closeBtn: {
    padding: 2,
  },
});
