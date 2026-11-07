import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ChefHatIcon, SparkleIcon } from './Icons';
import { NATIVE } from './motion';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

const STEPS = [
  'Organik yumurta ve vanilya köpürtülüyor',
  'Pandispanya 175°C taş fırında kabarıyor',
  'İpek pastacı kreması ve meyveler katmanlanıyor',
  'İsviçre merengi ile pürüzsüz sıvama yapılıyor',
  'Şeker çiçekler ve altın dokunuşlar işleniyor',
];

const STEP_MS = 2600;
const TRACK_WIDTH = 190;
const BAR_WIDTH = 70;

// Module-level so useLoop's effect deps stay stable across re-renders.
const EASE_OUT = Easing.out(Easing.quad);
const EASE_IN_OUT = Easing.inOut(Easing.quad);

function useLoop(duration: number, easing = Easing.linear, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: NATIVE }),
    );
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [v, duration, easing, delay]);
  return v;
}

type Props = {
  children?: React.ReactNode;
};

/** Cinematic "your cake is being rendered" state with pulsing rings and live status. */
export default function GeneratingLoader({ children }: Props) {
  useTx();
  const ringA = useLoop(2400, EASE_OUT);
  const ringB = useLoop(2400, EASE_OUT, 1200);
  const spin = useLoop(7000);
  const sweep = useLoop(1500, EASE_IN_OUT);

  const [step, setStep] = useState(0);
  const stepOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(stepOpacity, { toValue: 0, duration: 220, useNativeDriver: NATIVE }).start(() => {
        setStep((s) => (s + 1) % STEPS.length);
        Animated.timing(stepOpacity, { toValue: 1, duration: 320, useNativeDriver: NATIVE }).start();
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [stepOpacity]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.75] }) }],
  });

  return (
    <View style={styles.root}>
      <View style={styles.orb}>
        <View style={styles.glow} />
        <Animated.View style={[styles.ring, ringStyle(ringA)]} />
        <Animated.View style={[styles.ring, ringStyle(ringB)]} />
        <LinearGradient
          colors={[home.ctaFrom, home.ctaTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.core}
        >
          <Animated.View
            style={{
              transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
            }}
          >
            <SparkleIcon size={30} color={home.accentGold} />
          </Animated.View>
        </LinearGradient>
      </View>

      <Text style={styles.title}>{tx("Pastan fırında yükseliyor")}</Text>
      <Animated.Text style={[styles.step, { opacity: stepOpacity }]}>{tx(STEPS[step])}…</Animated.Text>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.bar,
            {
              transform: [
                {
                  translateX: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-BAR_WIDTH, TRACK_WIDTH],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(201, 154, 75, 0)', '#C99A4B', 'rgba(201, 154, 75, 0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  orb: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
  },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: '#C99A4B',
  },
  core: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.45)',
    shadowColor: '#9A6A22',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 20,
    color: home.ink,
  },
  step: {
    marginTop: 6,
    fontSize: 13.5,
    fontWeight: '500',
    color: home.body,
  },
  track: {
    marginTop: 18,
    width: TRACK_WIDTH,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(216, 196, 168, 0.35)',
  },
  bar: {
    width: BAR_WIDTH,
    height: '100%',
  },
});
