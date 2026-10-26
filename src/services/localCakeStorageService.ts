import { Platform } from 'react-native';

const CAKES_SUBDIRECTORY = 'lumiere_cakes/';

/**
 * expo-file-system legacy modülünü güvenli dinamik import ile yükler.
 * Web ortamında çökme yaşanmaması için Platform.OS kontrolü yapılır.
 */
function getFileSystem() {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-file-system/legacy');
  } catch (err) {
    try {
      return require('expo-file-system');
    } catch {
      return null;
    }
  }
}

/**
 * Telefonun yerel dosya sisteminde pastalar için özel klasör yolunu döner.
 * Android: /data/user/0/.../files/lumiere_cakes/
 * iOS: /var/mobile/Containers/Data/Application/.../Documents/lumiere_cakes/
 */
export function getLocalCakesDirectory(): string | null {
  const FileSystem = getFileSystem();
  if (!FileSystem || !FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${CAKES_SUBDIRECTORY}`;
}

/**
 * Yerel klasörün varlığını garanti eder, yoksa oluşturur.
 */
async function ensureCakesDirectoryExists(dirPath: string): Promise<void> {
  const FileSystem = getFileSystem();
  if (!FileSystem) return;

  try {
    const info = await FileSystem.getInfoAsync(dirPath);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  } catch (err) {
    console.warn('[LocalCakeStorage] Klasör oluşturma hatası:', err);
  }
}

/**
 * 1. ZERO-CLOUD / LOCAL-FIRST GÖRSEL SAKLAMA:
 * Gemini'den gelen Base64 veya geçici URL'i kullanıcının telefonunun kalıcı diskine yazar.
 * Sunucuya ASLA yüklenmez, %100 kullanıcının kendi cihazında kalır.
 *
 * @param imageUri Base64 data URI veya uzaktan gelen görsel bağlantısı
 * @param cakeId Pastanın benzersiz kimliği
 * @returns Telefonun yerel diskindeki kalıcı file:// dosya yolu
 */
export async function saveCakeImageLocally(
  imageUri: string,
  cakeId: string
): Promise<string> {
  // Web platformunda yerel dosya sistemi olmadığı için data URI doğrudan kullanılır
  if (Platform.OS === 'web' || !imageUri) {
    return imageUri;
  }

  const FileSystem = getFileSystem();
  const baseDir = getLocalCakesDirectory();

  if (!FileSystem || !baseDir) {
    return imageUri;
  }

  try {
    await ensureCakesDirectoryExists(baseDir);

    const safeId = cakeId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localTargetUri = `${baseDir}cake_${safeId}.jpg`;

    // A) Base64 Verisi Gelmişse (Gemini Doğrudan Üretim)
    if (imageUri.startsWith('data:image/')) {
      const base64Data = imageUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      await FileSystem.writeAsStringAsync(localTargetUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return localTargetUri;
    }

    // B) HTTP / HTTPS Bağlantısı Gelmişse
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const downloadResult = await FileSystem.downloadAsync(imageUri, localTargetUri);
      return downloadResult.uri || localTargetUri;
    }

    // C) Zaten yerel bir dosya yolu ise (file://)
    if (imageUri.startsWith('file://')) {
      // Zaten hedef klasördeyse tekrar kopyalamaya gerek yok
      if (imageUri.startsWith(baseDir)) {
        return imageUri;
      }
      // Geçici önbellekte ise kalıcı documentDirectory klasörüne kopyala
      await FileSystem.copyAsync({ from: imageUri, to: localTargetUri });
      return localTargetUri;
    }

    return imageUri;
  } catch (err) {
    console.warn('[LocalCakeStorage] Yerel diske yazma başarısız, orijinal URI kullanılıyor:', err);
    return imageUri;
  }
}

/**
 * 2. YEREL DİSKTEN GÖRSEL SİLME:
 * Kullanıcı koleksiyonundan bir pastayı sildiğinde telefon diskindeki görsel dosyasını da temizler.
 */
export async function deleteLocalCakeImage(fileUri?: string | null): Promise<void> {
  if (Platform.OS === 'web' || !fileUri || !fileUri.startsWith('file://')) {
    return;
  }

  const FileSystem = getFileSystem();
  if (!FileSystem) return;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (err) {
    console.warn('[LocalCakeStorage] Yerel dosya silinemedi:', err);
  }
}

/**
 * 3. TÜM YEREL PASTA GÖRSELLERİNİ TEMİZLEME:
 * Kullanıcı "Tümünü Temizle" yaptığında veya hesabını sıfırladığında çalışır.
 */
export async function clearAllLocalCakeStorage(): Promise<void> {
  if (Platform.OS === 'web') return;

  const FileSystem = getFileSystem();
  const baseDir = getLocalCakesDirectory();
  if (!FileSystem || !baseDir) return;

  try {
    const info = await FileSystem.getInfoAsync(baseDir);
    if (info.exists) {
      await FileSystem.deleteAsync(baseDir, { idempotent: true });
      await ensureCakesDirectoryExists(baseDir);
    }
  } catch (err) {
    console.warn('[LocalCakeStorage] Klasör temizleme hatası:', err);
  }
}
