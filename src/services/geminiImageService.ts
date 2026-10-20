import { ENV, hasAIBackend, isGeminiConfigured } from '../config/env';

export type GenerateImageResult = {
  success: boolean;
  imageUri?: string;
  error?: string;
};

/**
 * Nano Banana Pro için stüdyo kalitesinde hiper-gerçekçi pastacılık fotoğrafçılığı prompt zenginleştiricisi
 */
function buildEnhancedPrompt(userPrompt: string, hasReference = false): string {
  const multimodalGuidance = hasReference
    ? ' EXTREMELY IMPORTANT MULTIMODAL INSTRUCTION: Carefully examine the attached inspiration photo (such as wedding dress fabric, invitation card, floral theme, or venue decor). Harmoniously incorporate its exact color palette, motifs, textures, and aesthetic styling into the cake decorations, frosting, and presentation.'
    : '';

  return `Professional high-end gourmet culinary food photography of an exquisite handcrafted cake: ${userPrompt}.${multimodalGuidance} Studio lighting, award-winning pastry chef presentation, hyperrealistic texture, clean elegant background, shallow depth of field, 8k resolution.`;
}

/**
 * Güvenli Backend Proxy (BFF) üzerinden pasta görseli üretir.
 * Gemini API anahtarı sunucu tarafında gizli tutulur, istemciden ASLA sızdırılmaz.
 */
async function generateViaBackendProxy(
  prompt: string,
  referenceImageBase64?: string,
): Promise<GenerateImageResult> {
  const backendBase = ENV.AI_BACKEND_URL.replace(/\/+$/, '');
  const endpoint = `${backendBase}/api/generate-cake`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: ENV.GEMINI_IMAGE_MODEL,
        referenceImageBase64,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return {
          success: false,
          error: err?.message || 'Çok fazla pasta tasarlama isteği gönderildi. Lütfen 1 dakika sonra tekrar deneyiniz.',
        };
      }
      return {
        success: false,
        error: err?.error || err?.message || `Sunucu Hatası (${response.status})`,
      };
    }

    const data = await response.json();
    if (!data?.imageUri) {
      return {
        success: false,
        error: 'Sunucu geçerli bir görsel bağlantısı döndürmedi.',
      };
    }

    return {
      success: true,
      imageUri: data.imageUri,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Güvenli AI sunucusuna bağlanılamadı.',
    };
  }
}

/**
 * Doğrudan istemciden Gemini API çağrısı (SADECE yerel test/prototipleme için).
 * Derlenmiş canlı mobil uygulamalarda anahtar sızıntısını engellemek için Backend Proxy kullanılmalıdır.
 */
async function generateDirectGemini(
  prompt: string,
  referenceImageBase64?: string,
): Promise<GenerateImageResult> {
  if (__DEV__) {
    console.warn(
      '[GÜVENLİK UYARISI] Gemini API doğrudan mobil istemciden çağrılıyor. Canlıya alırken tersine mühendislik riskini önlemek için .env dosyasına EXPO_PUBLIC_AI_BACKEND_URL tanımlayınız.',
    );
  }

  const apiKey = ENV.GEMINI_API_KEY.trim();
  const model = ENV.GEMINI_IMAGE_MODEL.trim() || 'gemini-3-pro-image';
  const enhancedPrompt = buildEnhancedPrompt(prompt, Boolean(referenceImageBase64));

  try {
    // Model Imagen ailesinden ise :predict, Gemini 3 Pro (Nano Banana Pro) ise :generateContent kullanılır
    const isImagenModel = model.toLowerCase().startsWith('imagen');

    if (isImagenModel) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: enhancedPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            outputMimeType: 'image/jpeg',
            personGeneration: 'ALLOW_ADULT',
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          success: false,
          error: err?.error?.message || `API Hatası: ${response.status}`,
        };
      }

      const data = await response.json();
      const prediction = data?.predictions?.[0];
      if (!prediction?.bytesBase64Encoded) {
        return { success: false, error: 'Görsel verisi API yanıtında bulunamadı.' };
      }

      const mimeType = prediction.mimeType || 'image/jpeg';
      return {
        success: true,
        imageUri: `data:${mimeType};base64,${prediction.bytesBase64Encoded}`,
      };
    }

    // Nano Banana Pro (gemini-3-pro-image) endpoint'i (Multimodal inlineData desteği)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: enhancedPrompt }];
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceImageBase64,
        },
      });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '2K',
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err?.error?.message || `Gemini API Hatası (${response.status}: ${response.statusText})`,
      };
    }

    const data = await response.json();
    const candidates = data?.candidates || [];

    // Nano Banana Pro adaylarından üretilen görseli çıkar
    for (const candidate of candidates) {
      const candidateParts = candidate?.content?.parts || [];
      for (const part of candidateParts) {
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/jpeg';
          return {
            success: true,
            imageUri: `data:${mimeType};base64,${part.inlineData.data}`,
          };
        }
      }
    }

    return {
      success: false,
      error: 'Gemini yanıtında görsel parçası bulunamadı.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Ağ bağlantı hatası oluştu.',
    };
  }
}

import { addBreadcrumb, captureException, captureMessage } from './monitoringService';

const SLO_LATENCY_ALERT_MS = 15000; // 15 saniyeyi aşan üretimlerde SLO uyarısı tetiklenir

/**
 * Pasta görseli üretimini başlatır ve üretim performansını (Latency SLO & Başarı Oranı) izler.
 *
 * @param prompt Kullanıcının pasta yapılandırıcıdan oluşturduğu detaylı açıklama
 * @param referenceImageBase64 Opsiyonel ilham fotoğrafı (gelinlik, davetiye, konsept)
 */
export async function generateCakeImage(
  prompt: string,
  referenceImageBase64?: string,
): Promise<GenerateImageResult> {
  const startTime = Date.now();

  addBreadcrumb('ai_generation', 'Pasta görseli üretimi başlatıldı', {
    promptLength: prompt.length,
    hasReferenceImage: Boolean(referenceImageBase64),
  });

  if (!isGeminiConfigured()) {
    return {
      success: false,
      error: 'GEMINI_API_KEY_MISSING',
    };
  }

  try {
    let result: GenerateImageResult;
    if (hasAIBackend()) {
      result = await generateViaBackendProxy(prompt, referenceImageBase64);
    } else {
      result = await generateDirectGemini(prompt, referenceImageBase64);
    }

    const durationMs = Date.now() - startTime;

    // SLO Denetimi: 15 saniyeyi aşan gecikmelerde Sentry uyarısı üret
    if (durationMs > SLO_LATENCY_ALERT_MS) {
      captureMessage(
        `[SLO Alert] AI generation latency exceeded: ${(durationMs / 1000).toFixed(1)}s (SLO Threshold: 15s)`,
        'warning'
      );
    }

    if (result.success) {
      addBreadcrumb('ai_performance', `AI generated in ${durationMs}ms`, {
        latencyMs: durationMs,
        success: true,
      });
    } else {
      addBreadcrumb('ai_performance', `AI generation failed after ${durationMs}ms: ${result.error}`, {
        latencyMs: durationMs,
        success: false,
      });
      captureMessage(`[AI Error] Pasta üretilemedi: ${result.error}`, 'error');
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    captureException(err, {
      promptSnippet: prompt.slice(0, 100),
      durationMs,
    });
    return {
      success: false,
      error: (err as any)?.message || 'Yapay zeka üretim hatası oluştu.',
    };
  }
}


