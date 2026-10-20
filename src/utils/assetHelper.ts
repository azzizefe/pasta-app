import { Image as RNImage } from 'react-native';

/**
 * Hem Web (Metro/Webpack) hem de Native (iOS/Android) üzerinde
 * yerel asset'lerin (require('...')) geçerli URL'ini güvenle çözer.
 */
export function resolveAssetUri(source: any): string {
  if (!source) return '';

  // 1. Zaten doğrudan string URL ise
  if (typeof source === 'string') return source;

  // 2. { uri: string } objesi ise
  if (source.uri && typeof source.uri === 'string') {
    return source.uri;
  }

  // 3. Web'de ES modül default export'u ({ default: string } veya { default: { uri } })
  if (source.default) {
    if (typeof source.default === 'string') return source.default;
    if (source.default.uri && typeof source.default.uri === 'string') {
      return source.default.uri;
    }
  }

  // 4. Native React Native resolveAssetSource
  if (typeof (RNImage as any)?.resolveAssetSource === 'function') {
    try {
      const resolved = (RNImage as any).resolveAssetSource(source);
      if (resolved?.uri) return resolved.uri;
    } catch (err) {
      console.warn('resolveAssetSource hatası:', err);
    }
  }

  return '';
}
