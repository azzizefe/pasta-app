import { ENV, hasAIBackend, isGeminiConfigured } from '../config/env';
import type { ImageQuality } from '../types/savedCake';

function toImageSize(quality: ImageQuality) {
  return quality === '4k' ? '4K' : '2K';
}

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
    ? ' EXTREMELY IMPORTANT MULTIMODAL INSTRUCTION: Carefully examine the attached inspiration photo (such as fabric texture, color palette, graphic motif, or stationery style). Harmoniously incorporate its exact color palette, motifs, textures, and aesthetic styling into the cake decorations, frosting, and presentation without adding extraneous unrequested items.'
    : '';

  const lower = userPrompt.toLocaleLowerCase('tr-TR');
  const mentionsFlowers =
    lower.includes('çiçek') ||
    lower.includes('cicek') ||
    lower.includes('gül') ||
    lower.includes('gul') ||
    lower.includes('papatya') ||
    lower.includes('orkide') ||
    lower.includes('floral') ||
    lower.includes('flower') ||
    lower.includes('rose') ||
    lower.includes('blossom') ||
    lower.includes('şakayık') ||
    lower.includes('sakayik') ||
    lower.includes('botanik');

  const flowerConstraint = mentionsFlowers
    ? ''
    : ' CRITICAL NEGATIVE CONSTRAINT - NO FLOWERS: Flowers are NOT requested in the prompt. Do NOT add any flowers, sugar flowers, edible roses, floral accents, petals, leaves, or botanical decorations anywhere on or around the cake. The cake surface must remain completely free of flowers.';

  return `Professional high-end gourmet culinary food photography of an exquisite handcrafted cake: ${userPrompt}.${multimodalGuidance} Studio lighting, award-winning pastry chef presentation, hyperrealistic texture, clean elegant background, shallow depth of field, 8k resolution. STRICT FIDELITY RULE: Adhere 100% strictly and exclusively to the user description. Do NOT add any unrequested decorations, unrequested toppings, unrequested pearls, unrequested figurines, or unrequested embellishments. Only depict what is explicitly written in the prompt.${flowerConstraint} KATI KURAL: Yazılanların kesinlikle dışına çıkma; metinde belirtilmeyen hiçbir süsleme, çiçek veya detayı ekleme.`;
}

/**
 * Güvenli Backend Proxy (BFF) üzerinden pasta görseli üretir.
 * Gemini API anahtarı sunucu tarafında gizli tutulur, istemciden ASLA sızdırılmaz.
 */
async function generateViaBackendProxy(
  prompt: string,
  referenceImageBase64: string | undefined,
  quality: ImageQuality,
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
        imageSize: toImageSize(quality),
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
  referenceImageBase64: string | undefined,
  quality: ImageQuality,
): Promise<GenerateImageResult> {
  if (__DEV__) {
    console.warn(
      '[GÜVENLİK UYARISI] Gemini API doğrudan mobil istemciden çağrılıyor. Canlıya alırken tersine mühendislik riskini önlemek için .env dosyasına EXPO_PUBLIC_AI_BACKEND_URL tanımlayınız.',
    );
  }

  const apiKey = ENV.GEMINI_API_KEY.trim();
  let model = ENV.GEMINI_IMAGE_MODEL.trim() || 'gemini-3.1-flash-image';
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
            imageSize: toImageSize(quality),
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
 * @param quality 'standard' = 2K, '4k' = 4K çıktı
 */
import { validatePromptSafety } from '../utils/security';

export async function generateCakeImage(
  prompt: string,
  referenceImageBase64?: string,
  quality: ImageQuality = ENV.DEFAULT_IMAGE_QUALITY || '4k',
): Promise<GenerateImageResult> {
  const startTime = Date.now();

  // İSTEMCİ GÜVENLİK KALKANI: XSS ve Prompt Injection Doğrulaması
  const promptCheck = validatePromptSafety(prompt);
  if (!promptCheck.isSafe) {
    return {
      success: false,
      error: 'Güvenlik Uyarısı: Girilen metin sistem güvenlik ilkelerine uygun değildir.',
    };
  }
  const safePrompt = promptCheck.sanitizedText;

  addBreadcrumb('ai_generation', 'Pasta görseli üretimi başlatıldı', {
    promptLength: safePrompt.length,
    hasReferenceImage: Boolean(referenceImageBase64),
    quality,
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
      result = await generateViaBackendProxy(safePrompt, referenceImageBase64, quality);
    } else {
      result = await generateDirectGemini(safePrompt, referenceImageBase64, quality);
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


