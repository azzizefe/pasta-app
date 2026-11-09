import * as ImagePicker from 'expo-image-picker';

import { showAlert } from './alert';
import { tx } from '../i18n/tx';

export type PickedImage = { uri: string; base64: string };

/** Lets the user pick an inspiration photo from the gallery; null if cancelled or denied. */
export async function pickReferenceImage(): Promise<PickedImage | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        tx('Galeri İzni Gerekli'),
        tx('İlham fotoğrafı seçebilmek için fotoğraf galerisi erişimine izin vermelisiniz.'),
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = result.canceled ? undefined : result.assets?.[0];
    return asset?.uri && asset.base64 ? { uri: asset.uri, base64: asset.base64 } : null;
  } catch {
    showAlert(tx('Hata'), tx('Fotoğraf seçilemedi.'));
    return null;
  }
}
