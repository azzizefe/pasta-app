import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import CakeImage from './CakeImage';

interface Props {
  uri: string;
  style?: any;
}

// Generated cakes are 3:4; used until the real size is known.
const DEFAULT_ASPECT = 3 / 4;
// The image grows up to 20% past its fitted size to fill the empty space,
// cropping its edges a little (about 8% per side at most).
const FILL_STRETCH = 1.2;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const SNAP_SPRING = { damping: 24, stiffness: 240, mass: 0.9 };

/** iOS-style resistance once a value is dragged past its limit. */
function rubberBand(value: number, min: number, max: number, dimension: number) {
  'worklet';
  if (dimension <= 0) return Math.min(Math.max(value, min), max);
  const resist = (over: number) => (1 - 1 / ((over * 0.55) / dimension + 1)) * dimension;
  if (value < min) return min - resist(min - value);
  if (value > max) return max + resist(value - max);
  return value;
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export default function PinchableImageViewer({ uri, style }: Props) {
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);

  let imageBox: { width: number; height: number } | null = null;
  if (area) {
    const fittedWidth = Math.min(area.width, area.height * aspect);
    const fittedHeight = fittedWidth / aspect;
    imageBox = {
      width: Math.min(area.width, fittedWidth * FILL_STRETCH),
      height: Math.min(area.height, fittedHeight * FILL_STRETCH),
    };
  }

  // Sizes read by the gesture worklets.
  const areaW = useSharedValue(0);
  const areaH = useSharedValue(0);
  const boxW = useSharedValue(0);
  const boxH = useSharedValue(0);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // Values captured when a gesture starts.
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const isPinching = useSharedValue(false);

  useEffect(() => {
    if (!area || !imageBox) return;
    areaW.value = area.width;
    areaH.value = area.height;
    boxW.value = imageBox.width;
    boxH.value = imageBox.height;
  }, [area?.width, area?.height, imageBox?.width, imageBox?.height]);

  // A new image always opens at 1x, centered.
  useEffect(() => {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
  }, [uri]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height }
    );
  };

  /** How far the image may move from center at a given zoom. */
  const maxOffsetX = (s: number) => {
    'worklet';
    return Math.max(0, (boxW.value * s - areaW.value) / 2);
  };
  const maxOffsetY = (s: number) => {
    'worklet';
    return Math.max(0, (boxH.value * s - areaH.value) / 2);
  };

  /** Springs scale back into [MIN, MAX] and the image back inside its edges. */
  const settle = (focalX: number, focalY: number) => {
    'worklet';
    let s = scale.value;
    let x = tx.value;
    let y = ty.value;
    if (s < MIN_SCALE) {
      s = MIN_SCALE;
      x = 0;
      y = 0;
    } else if (s > MAX_SCALE) {
      // Shrink toward the fingers so the spot being looked at stays put.
      const ratio = MAX_SCALE / s;
      x = focalX - (focalX - x) * ratio;
      y = focalY - (focalY - y) * ratio;
      s = MAX_SCALE;
    }
    x = clamp(x, -maxOffsetX(s), maxOffsetX(s));
    y = clamp(y, -maxOffsetY(s), maxOffsetY(s));
    scale.value = withSpring(s, SNAP_SPRING);
    tx.value = withSpring(x, SNAP_SPRING);
    ty.value = withSpring(y, SNAP_SPRING);
  };

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      isPinching.value = true;
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
      startFocalX.value = e.focalX - areaW.value / 2;
      startFocalY.value = e.focalY - areaH.value / 2;
    })
    .onUpdate((e) => {
      const raw = startScale.value * e.scale;
      // Below 1x or above the max, the image resists instead of following the fingers.
      const s =
        raw < MIN_SCALE
          ? MIN_SCALE - (MIN_SCALE - raw) * 0.2
          : raw > MAX_SCALE
            ? MAX_SCALE + (raw - MAX_SCALE) * 0.2
            : raw;
      const ratio = s / startScale.value;
      const focalX = e.focalX - areaW.value / 2;
      const focalY = e.focalY - areaH.value / 2;
      // Keep the point under the fingers fixed, and follow the fingers if they move.
      scale.value = s;
      tx.value = focalX - (startFocalX.value - startTx.value) * ratio;
      ty.value = focalY - (startFocalY.value - startTy.value) * ratio;
    })
    .onEnd((e) => {
      settle(e.focalX - areaW.value / 2, e.focalY - areaH.value / 2);
    })
    .onFinalize(() => {
      isPinching.value = false;
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      if (isPinching.value) return;
      const s = scale.value;
      tx.value = rubberBand(startTx.value + e.translationX, -maxOffsetX(s), maxOffsetX(s), areaW.value);
      ty.value = rubberBand(startTy.value + e.translationY, -maxOffsetY(s), maxOffsetY(s), areaH.value);
    })
    .onEnd((e) => {
      if (isPinching.value) return;
      const s = scale.value;
      const limitX = maxOffsetX(s);
      const limitY = maxOffsetY(s);
      // Pulled past an edge: spring back. Otherwise glide with the flick and stop at the edge.
      tx.value =
        Math.abs(tx.value) > limitX
          ? withSpring(clamp(tx.value, -limitX, limitX), SNAP_SPRING)
          : withDecay({ velocity: e.velocityX, clamp: [-limitX, limitX] });
      ty.value =
        Math.abs(ty.value) > limitY
          ? withSpring(clamp(ty.value, -limitY, limitY), SNAP_SPRING)
          : withDecay({ velocity: e.velocityY, clamp: [-limitY, limitY] });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e) => {
      if (scale.value > MIN_SCALE + 0.01) {
        scale.value = withSpring(MIN_SCALE, SNAP_SPRING);
        tx.value = withSpring(0, SNAP_SPRING);
        ty.value = withSpring(0, SNAP_SPRING);
        return;
      }
      // Zoom in on the tapped spot.
      const s = DOUBLE_TAP_SCALE;
      const focalX = e.x - areaW.value / 2;
      const focalY = e.y - areaH.value / 2;
      const x = clamp(focalX - focalX * s, -maxOffsetX(s), maxOffsetX(s));
      const y = clamp(focalY - focalY * s, -maxOffsetY(s), maxOffsetY(s));
      scale.value = withSpring(s, SNAP_SPRING);
      tx.value = withSpring(x, SNAP_SPRING);
      ty.value = withSpring(y, SNAP_SPRING);
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.touchArea} onLayout={handleLayout}>
          {imageBox && (
            <Animated.View style={[styles.imageBox, imageBox, imageStyle]}>
              <CakeImage
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
                onLoad={(e) => {
                  const { width, height } = e.source;
                  if (width > 0 && height > 0) setAspect(width / height);
                }}
                priority="high"
                showShimmer={false}
                backgroundColor="transparent"
              />
            </Animated.View>
          )}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBox: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
