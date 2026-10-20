import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, radii } from '../theme/theme';

type Props = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Pill-shaped sign-in button with a subtle press-in animation so the screen
 * feels alive without any extra gesture library.
 */
export default function AuthButton({ label, icon, onPress, disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Animated.View style={[styles.wrapper, style, disabled && styles.disabled, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={disabled ? undefined : onPress}
        onPressIn={() => !disabled && animateTo(0.97)}
        onPressOut={() => !disabled && animateTo(1)}
        android_ripple={{ color: 'rgba(42,26,21,0.06)', borderless: false }}
        style={styles.pressable}
      >
        <View style={styles.iconSlot}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    // Layered shadow: iOS gets the soft blur, Android the elevation.
    shadowColor: '#5C2E2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
  },
  pressable: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 16.5,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: colors.ink,
  },
  disabled: {
    opacity: 0.65,
  },
});

