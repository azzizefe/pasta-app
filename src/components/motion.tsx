import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// The web build has no native animation driver and warns when asked for one.
export const NATIVE = Platform.OS !== 'web';

type FadeInUpProps = {
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Rises and fades its children in once, on mount. */
export function FadeInUp({ delay = 0, distance = 16, duration = 560, style, children }: FadeInUpProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  scaleTo?: number;
  /** Applied to the animated wrapper (layout, margins, shadows). */
  style?: StyleProp<ViewStyle>;
  /** Applied to the Pressable itself (radius + overflow for the ripple). */
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Pressable that springs down slightly while held. */
export function PressableScale({
  scaleTo = 0.97,
  style,
  contentStyle,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 5,
      useNativeDriver: NATIVE,
    }).start();

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        style={contentStyle}
        onPressIn={(e) => {
          springTo(scaleTo);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          springTo(1);
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

type ShineSweepProps = {
  /** Pause between sweeps, in ms. */
  interval?: number;
  /** Wait before the first sweep, so neighbouring buttons don't flash in sync. */
  initialDelay?: number;
  color?: string;
};

/**
 * A soft diagonal highlight that glides across its parent every few seconds.
 * The parent must clip (overflow: 'hidden') and have a border radius.
 */
export function ShineSweep({
  interval = 3200,
  initialDelay = 900,
  color = 'rgba(255, 238, 205, 0.32)',
}: ShineSweepProps) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!width) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.delay(interval),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
      ]),
    );
    const start = setTimeout(() => loop.start(), initialDelay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [width, x, interval, initialDelay]);

  const band = Math.max(56, width * 0.32);
  const clear = color.replace(/[\d.]+\)$/, '0)');

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.shineBand,
            {
              width: band,
              transform: [
                {
                  translateX: x.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-band * 1.6, width + band * 0.6],
                  }),
                },
                { rotate: '20deg' },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[clear, color, clear]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

type FloatProps = {
  distance?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Slow, endless bob up and down, so hero artwork feels alive. */
export function Float({ distance = 4, duration = 3000, delay = 0, style, children }: FloatProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: ease, useNativeDriver: NATIVE }),
        Animated.timing(t, { toValue: 0, duration, easing: ease, useNativeDriver: NATIVE }),
      ]),
    );
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [t, duration, delay]);

  return (
    <Animated.View
      style={[
        style,
        { transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type RevealProps = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Settles from a slight zoom into place while fading in; remount (via key) to replay. */
export function Reveal({ style, children }: RevealProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Counts from the previous value (0 on mount) up or down to `target`. */
export function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(value, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    // A balance must never be left showing a wrong number if frames stall (e.g. a background tab).
    const settle = setTimeout(() => setDisplay(target), duration + 150);
    return () => {
      clearTimeout(settle);
      value.removeListener(id);
    };
  }, [target, duration, value]);

  return display;
}

const styles = StyleSheet.create({
  shineBand: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    left: 0,
  },
});
