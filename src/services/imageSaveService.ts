import { Platform } from 'react-native';

export interface SaveImageResult {
  success: boolean;
  message: string;
}

/**
 * Pasta görselini cihaza / galeriye kaydetme servisi (Native iOS & Android).
 */
export async function saveCakeImageToDevice(
  imageUri: string,
  cakeTitle: string = 'pasta'
): Promise<SaveImageResult> {
  try {
    const safeTitle = cakeTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 25);
    const filename = `lumiere-${safeTitle || 'pasta'}-${Date.now()}.jpg`;

    // Web Fallback
    if (Platform.OS === 'web') {
      const { saveCakeImageToDevice: saveWeb } = await import('./imageSaveService.web');
      return saveWeb(imageUri, cakeTitle);
    }

    // Native Mobile Modules (Dynamic import to protect web bundles)
    const FileSystem = require('expo-file-system/legacy');
    const MediaLibrary = require('expo-media-library');
    const Sharing = require('expo-sharing');

    const targetFileUri = `${FileSystem.cacheDirectory}${filename}`;

    if (imageUri.startsWith('data:image/')) {
      const base64Data = imageUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      await FileSystem.writeAsStringAsync(targetFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      await FileSystem.downloadAsync(imageUri, targetFileUri);
    }

    const localFile = imageUri.startsWith('file://') ? imageUri : targetFileUri;

    // Fotoğraf galerisi izni iste ve kaydet
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(localFile);
        return {
          success: true,
          message: 'Pasta fotoğrafı galerinize kaydedildi! 📸',
        };
      }
    } catch (e) {
      console.warn('MediaLibrary kaydetme denemesi:', e);
    }

    // Yedek: Sistem Paylaşım Menüsü (Kullanıcı "Görseli Kaydet" seçebilir)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localFile, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Pastayı Kaydet veya Paylaş',
        UTI: 'public.jpeg',
      });
      return {
        success: true,
        message: 'Paylaşım penceresi açıldı.',
      };
    }

    return {
      success: false,
      message: 'Cihazınızda görsel kaydetme izni bulunamadı.',
    };
  } catch (error: any) {
    console.error('saveCakeImageToDevice hatası:', error);
    return {
      success: false,
      message: error?.message || 'Görsel kaydedilirken bir sorun oluştu.',
    };
  }
}
