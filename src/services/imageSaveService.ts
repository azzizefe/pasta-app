import { Platform } from 'react-native';
import { tx } from '../i18n/tx';

export interface SaveImageResult {
  success: boolean;
  message: string;
}

function extensionFor(imageUri: string): string {
  const dataMatch = imageUri.match(/^data:image\/([a-zA-Z]+);base64,/);
  const raw = dataMatch?.[1] ?? imageUri.split('?')[0].split('.').pop() ?? '';
  const ext = raw.toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
  if (ext === 'png' || ext === 'webp' || ext === 'heic') return ext;
  return 'jpg';
}

/**
 * Pasta görselini doğrudan telefonun fotoğraf galerisine kaydeder (iOS & Android).
 */
export async function saveCakeImageToDevice(
  imageUri: string,
  cakeTitle: string = tx("pasta")
): Promise<SaveImageResult> {
  if (Platform.OS === 'web') {
    const { saveCakeImageToDevice: saveWeb } = await import('./imageSaveService.web');
    return saveWeb(imageUri, cakeTitle);
  }

  // Native modules are required lazily so they never load in the web bundle.
  const FileSystem = require('expo-file-system/legacy');
  // SDK 58: the old saveToLibraryAsync() from "expo-media-library" always throws;
  // the new class-based API (Asset.create) is the supported way to save.
  const MediaLibrary = require('expo-media-library');

  try {
    // Sadece "ekleme" izni istenir; galeriyi okuma izni gerekmez.
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) {
      return {
        success: false,
        message: tx("Galeriye kaydetmek için Ayarlar’dan fotoğraf iznini açın."),
      };
    }

    let localFile = imageUri;
    if (!imageUri.startsWith('file://')) {
      const safeTitle = cakeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 25);
      const filename = `lumiere-${safeTitle || 'pasta'}-${Date.now()}.${extensionFor(imageUri)}`;
      localFile = `${FileSystem.cacheDirectory}${filename}`;

      if (imageUri.startsWith('data:image/')) {
        const base64Data = imageUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        await FileSystem.writeAsStringAsync(localFile, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        await FileSystem.downloadAsync(imageUri, localFile);
      } else {
        await FileSystem.copyAsync({ from: imageUri, to: localFile });
      }
    }

    await MediaLibrary.Asset.create(localFile);
    return {
      success: true,
      message: tx("Pasta fotoğrafı galerinize kaydedildi! 📸"),
    };
  } catch (error: any) {
    console.error('saveCakeImageToDevice hatası:', error);
    return {
      success: false,
      message: tx("Görsel galeriye kaydedilemedi. Lütfen tekrar deneyin."),
    };
  }
}
