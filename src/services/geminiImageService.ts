import { ENV, hasAIBackend, isGeminiConfigured } from '../config/env';
import { AI_CONSENT_REQUIRED, hasAiConsent } from './aiConsentService';
import type { ImageQuality } from '../types/savedCake';
import { buildImagePrompt, guardReferenceImage } from '../../server/prompt-guard';

function toImageSize(quality: ImageQuality) {
  return quality === '4k' ? '4K' : '2K';
}

export type GenerateImageResult = {
  success: boolean;
  imageUri?: string;
  error?: string;
};

/**
 * Görsel prompt'u: kullanıcı açıklaması talimatlardan ayrı bir blokta durur
 * (server/prompt-guard.js — sunucuyla aynı metin).
 */
function buildEnhancedPrompt(userPrompt: string, hasReference = false): string {
  return buildImagePrompt(userPrompt, hasReference);
}

/**
 * Gemini görsel yerine boş/metin yanıt döndürdüğünde (çoğunlukla ek isteklerdeki
 * bir ifade güvenlik filtresine takıldığında) kullanıcıya ne yapacağını söyler.
 */
function describeMissingImage(data: any): string {
  const blockReason: string | undefined = data?.promptFeedback?.blockReason;
  const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;
  const reason = blockReason || finishReason || '';

  if (/SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION|OTHER/i.test(reason)) {
    return tx("Yapay zeka bu açıklamayla görsel oluşturmadı. Ek isteklerinde gerçek kişi, marka, logo veya hassas bir ifade varsa çıkarıp tekrar dene.");
  }
  return tx("Yapay zeka bu sefer görsel döndürmedi. Ek isteklerini biraz daha sade yazıp tekrar dene.");
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
        referenceImageBase64,
        imageSize: toImageSize(quality),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return {
          success: false,
          error: err?.message || tx("Çok fazla pasta tasarlama isteği gönderildi. Lütfen 1 dakika sonra tekrar deneyiniz."),
        };
      }
      return {
        success: false,
        error: err?.error || err?.message || tx("Sunucu Hatası ({status})", { status: response.status }),
      };
    }

    const data = await response.json();
    if (!data?.imageUri) {
      return {
        success: false,
        error: tx("Sunucu geçerli bir görsel bağlantısı döndürmedi."),
      };
    }

    return {
      success: true,
      imageUri: data.imageUri,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || tx("Güvenli AI sunucusuna bağlanılamadı."),
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
          error: err?.error?.message || tx("API Hatası: {status}", { status: response.status }),
        };
      }

      const data = await response.json();
      const prediction = data?.predictions?.[0];
      if (!prediction?.bytesBase64Encoded) {
        return { success: false, error: tx("Görsel verisi API yanıtında bulunamadı.") };
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
      const reference = guardReferenceImage(referenceImageBase64);
      parts.push({
        inlineData: {
          mimeType: reference.ok && reference.mimeType ? reference.mimeType : 'image/jpeg',
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
        error: err?.error?.message || tx("Gemini API Hatası ({status}: {statusText})", { status: response.status, statusText: response.statusText }),
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
      error: describeMissingImage(data),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || tx("Ağ bağlantı hatası oluştu."),
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
import { tx } from '../i18n/tx';

export async function generateCakeImage(
  prompt: string,
  referenceImageBase64?: string,
  quality: ImageQuality = ENV.DEFAULT_IMAGE_QUALITY || '4k',
): Promise<GenerateImageResult> {
  const startTime = Date.now();

  // Kullanıcı yapay zeka veri paylaşımına izin vermediyse hiçbir veri gönderilmez (Apple 5.1.2(i)).
  if (!(await hasAiConsent())) {
    return { success: false, error: AI_CONSENT_REQUIRED };
  }

  // İSTEMCİ GÜVENLİK KALKANI: XSS ve Prompt Injection Doğrulaması
  const promptCheck = validatePromptSafety(prompt);
  if (!promptCheck.isSafe) {
    return {
      success: false,
      error:
        promptCheck.userMessage ||
        tx("Güvenlik Uyarısı: Girilen metin sistem güvenlik ilkelerine uygun değildir."),
    };
  }
  const safePrompt = promptCheck.sanitizedText;

  // İlham fotoğrafı gerçek bir görsel mi? (sahte dosya / aşırı büyük dosya engeli)
  const imageCheck = guardReferenceImage(referenceImageBase64);
  if (!imageCheck.ok) {
    return { success: false, error: imageCheck.message };
  }
  referenceImageBase64 = imageCheck.data ?? undefined;

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
      error: (err as any)?.message || tx("Yapay zeka üretim hatası oluştu."),
    };
  }
}


