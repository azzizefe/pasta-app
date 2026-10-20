export interface SaveImageResult {
  success: boolean;
  message: string;
}

/**
 * Web platformu için görsel indirme servisi.
 * Blob / Data URI oluşturarak tarayıcıda dosya indirme tetikler.
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

    let downloadUrl = imageUri;
    let needRevoke = false;

    // Uzaktan URL ise (http/https) CORS ve indirme için Blob'a dönüştür
    if (!imageUri.startsWith('data:') && !imageUri.startsWith('blob:')) {
      try {
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        downloadUrl = window.URL.createObjectURL(blob);
        needRevoke = true;
      } catch {
        // Fetch başarısız olursa doğrudan URL'i dene
        downloadUrl = imageUri;
      }
    }

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (needRevoke) {
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 5000);
    }

    return {
      success: true,
      message: 'Görsel bilgisayarınıza indirildi! ⬇',
    };
  } catch (error: any) {
    console.error('Web indirme hatası:', error);
    return {
      success: false,
      message: error?.message || 'Görsel indirilemedi.',
    };
  }
}
