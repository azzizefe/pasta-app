import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookmarkIcon, HomeIcon, UserIcon } from './Icons';
import { NATIVE } from './motion';
import { home } from '../theme/theme';

export type TabKey = 'home' | 'saved' | 'profile';

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

const TABS: Array<{
  key: TabKey;
  label: string;
  Icon: typeof HomeIcon;
}> = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'saved', label: 'Saved', Icon: BookmarkIcon },
  { key: 'profile', label: 'Profile', Icon: UserIcon },
];

const PILL_WIDTH = 60;

/** Three-slot bottom bar with a gold pill that glides to the active tab. */
export default function TabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = TABS.findIndex((t) => t.key === active);
  const position = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: activeIndex,
      speed: 16,
      bounciness: 7,
      useNativeDriver: NATIVE,
    }).start();
  }, [activeIndex, position]);

  const tabWidth = barWidth / TABS.length;

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom || 10 }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {barWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              left: (tabWidth - PILL_WIDTH) / 2,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: TABS.map((_, i) => i),
                    outputRange: TABS.map((_, i) => i * tabWidth),
                  }),
                },
              ],
            },
          ]}
        />
      )}

      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        const tint = isActive ? home.ink : home.tabInactive;

        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(key)}
            style={styles.tab}
          >
            <View style={styles.iconSlot}>
              <Icon size={22} color={tint} strokeWidth={isActive ? 1.9 : 1.6} />
            </View>
            <Text style={[styles.label, { color: tint }, isActive && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: home.tabBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: home.tabBorder,
    paddingTop: 8,
  },
  pill: {
    position: 'absolute',
    top: 6,
    width: PILL_WIDTH,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(243, 217, 166, 0.5)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlot: {
    height: 30,
    justifyContent: 'center',
  },
  label: {
    marginTop: 3,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '700',
  },
});
