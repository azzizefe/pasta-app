import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const SUPPORT_EMAIL = 'support@lumieresucree.app';
export const WEBSITE_URL = 'https://lumieresucree.app';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function getDeviceLabel() {
  const os = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
  return Platform.OS === 'web' ? os : `${os} ${Platform.Version}`;
}

export function buildSupportMailto(subject: string, body = '') {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
