import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import ShimmerPlaceholder from './ShimmerPlaceholder';

/**
 * Lumière Sucrée Sıcak Altın & Fildişi Tonlarında Özel Pasta Blurhash'i
 * Görsel sunucudan inene kadar ekranda anında pürüzsüz bir altın-krem pastel renk alanı gösterir.
 */
export const CAKE_BLURHASH = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';

export interface CakeImageProps extends Omit<ImageProps, 'placeholder'> {
  showShimmer?: boolean;
  blurhash?: string;
  borderRadius?: number;
  backgroundColor?: string;
}

/**
 * Yüksek Performanslı Pasta Görseli Bileşeni (expo-image Tabanlı)
 *
 * ÖZELLİKLER:
 * 1. Blurhash Desteği: Görsel inmeden önce sıfır gecikmeli altın-fildişi tonlama.
 * 2. Disk ve Hafıza Önbelleklemesi (Memory & Disk Cache): Görsel bir kez indikten sonra
 *    tekrar asla internet harcamaz; çevrimdışı dahi anında açılır.
 * 3. Shimmer İskeleti: İndirme esnasında lüks ışık dalgalanması efekti.
 * 4. Pürüzsüz Cross-Fade Geçişi: 350ms yumuşak geçiş ile yüklenir.
 */
export default function CakeImage({
  source,
  style,
  contentFit = 'cover',
  transition = 350,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  showShimmer = true,
  blurhash = CAKE_BLURHASH,
  borderRadius = 0,
  backgroundColor,
  onLoadStart,
  onLoadEnd,
  ...rest
}: CakeImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={[styles.wrapper, { borderRadius }, backgroundColor ? { backgroundColor } : null, style]}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        contentFit={contentFit}
        transition={transition}
        cachePolicy={cachePolicy}
        priority={priority}
        placeholder={{ blurhash }}
        onLoadStart={() => {
          setIsLoading(true);
          onLoadStart?.();
        }}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
        {...rest}
      />

      {/* Görsel yüklenene kadar gösterilen parıltılı Shimmer iskeleti */}
      {showShimmer && isLoading && (
        <View style={[StyleSheet.absoluteFill, { borderRadius }]}>
          <ShimmerPlaceholder borderRadius={borderRadius} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: '#F7EFE2',
    position: 'relative',
  },
});
