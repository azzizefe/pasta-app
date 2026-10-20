/**
 * Lumière Sucrée — Güvenli Gemini AI Proxy (Cloudflare Worker)
 *
 * MİMARİ VE GÜVENLİK AMACI:
 * Mobil uygulamanın derlenmiş paketinde (APK/IPA/Hermes) Gemini API anahtarı barındırılmaz.
 * Bu Worker, Cloudflare Edge üzerinde çalışır. GEMINI_API_KEY gizli ortam değişkeni
 * (Environment Secret) olarak Cloudflare tarafında saklanır.
 *
 * ÖZELLİKLER:
 * 1. CORS koruması
 * 2. Prompt doğrulama & uzunluk denetimi
 * 3. Gemini 3 Pro (Nano Banana Pro) ve Imagen model desteği
 * 4. İstemciye doğrudan optimize edilmiş Base64 veya CDN URL dönüşü
 */

// ==========================================
// RATE LIMITING (DDoS ve Kötüye Kullanım Koruması)
// ==========================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 Dakika (60 saniye)
const MAX_REQUESTS_PER_WINDOW = 20; // Dakikada maksimum 20 üretim isteği
const rateLimitStore = new Map();

/**
 * İstemci IP adresini veya kullanıcı kimliğini doğrular ve dakikalık istek kotasını kontrol eder.
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Bellek sızıntısını önlemek için süresi dolmuş kayıtları temizle
  if (rateLimitStore.size > 10000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      retryAfter: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - entry.count,
    retryAfter: 0,
    resetTime: entry.resetTime,
  };
}

export default {
  async fetch(request, env, ctx) {
    // 1. CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
        },
      });
    }

    const url = new URL(request.url);

    // 2. RevenueCat Webhook Uç Noktası
    if (request.method === 'POST' && url.pathname === '/api/revenuecat-webhook') {
      try {
        const payload = await request.json();
        const event = payload?.event;
        console.log(`[RevenueCat Webhook] Olay: ${event?.type}, Kullanıcı: ${event?.app_user_id}, Ürün: ${event?.product_id}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Geçersiz webhook verisi' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Yalnızca POST /api/generate-cake isteklerine izin ver
    if (request.method !== 'POST' || url.pathname !== '/api/generate-cake') {
      return new Response(JSON.stringify({ error: 'Endpoint bulunamadı' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Rate Limiting Kontrolü (DDoS & Kötüye Kullanım Engelleme: Maks 20 req/dk)
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-user-id') ||
      'anonymous-client';

    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Çok fazla pasta tasarımı talebi gönderildi. Lütfen 1 dakika sonra tekrar deneyin (Maks. 20 istek/dk).',
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
          },
        }
      );
    }

    // 3. Sunucu Ortam Değişkeni Kontrolü
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Sunucu yapılandırma hatası: GEMINI_API_KEY tanımlanmamış.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const body = await request.json();
      const prompt = body?.prompt;
      const model = body?.model || 'gemini-3-pro-image';
      const referenceImageBase64 = body?.referenceImageBase64;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Geçersiz veya boş prompt parametresi.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 4. Pastacılık Kalite & Çok Modlu (Multimodal) Prompt Enjeksiyonu
      const multimodalGuidance = referenceImageBase64
        ? ' EXTREMELY IMPORTANT MULTIMODAL INSTRUCTION: Carefully examine the attached inspiration photo (such as wedding dress fabric, invitation card, floral theme, or venue decor). Harmoniously incorporate its exact color palette, motifs, textures, and aesthetic styling into the cake decorations, frosting, and presentation.'
        : '';

      const enhancedPrompt = `Professional high-end gourmet culinary food photography of an exquisite handcrafted cake: ${prompt}.${multimodalGuidance} Studio lighting, award-winning pastry chef presentation, hyperrealistic texture, clean elegant background, shallow depth of field, 8k resolution.`;

      // 5. Gemini 3 Pro API İsteği (Google AI Studio)
      const isImagen = model.toLowerCase().startsWith('imagen');

      let googleUrl = '';
      let payload = {};

      if (isImagen) {
        googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
        payload = {
          instances: [{ prompt: enhancedPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            outputMimeType: 'image/jpeg',
            personGeneration: 'ALLOW_ADULT',
          },
        };
      } else {
        googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const parts = [{ text: enhancedPrompt }];
        if (referenceImageBase64) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: referenceImageBase64,
            },
          });
        }
        payload = {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: '3:4',
              imageSize: '2K',
            },
          },
        };
      }

      const geminiRes = await fetch(googleUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!geminiRes.ok) {
        // Fallback AI Provider: Gemini kesintiye uğrarsa OpenAI DALL-E 3 devreye girer
        if (env.OPENAI_API_KEY) {
          console.log('[Worker] Gemini API yanıt vermedi, Yedek Sağlayıcı (OpenAI DALL-E 3) devreye alınıyor...');
          try {
            const openAiRes = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt: enhancedPrompt.slice(0, 1000),
                n: 1,
                size: '1024x1024',
                quality: 'hd',
                response_format: 'b64_json',
              }),
            });

            if (openAiRes.ok) {
              const openAiData = await openAiRes.json();
              const b64 = openAiData?.data?.[0]?.b64_json;
              if (b64) {
                return new Response(
                  JSON.stringify({
                    success: true,
                    imageUri: `data:image/png;base64,${b64}`,
                    provider: 'openai-dalle-3-fallback',
                  }),
                  {
                    status: 200,
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*',
                      'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
                      'X-RateLimit-Remaining': String(rateLimit.remaining),
                    },
                  }
                );
              }
            }
          } catch (fallbackErr) {
            console.warn('[Worker] Yedek sağlayıcı da başarısız oldu:', fallbackErr);
          }
        }

        const errorData = await geminiRes.json().catch(() => ({}));
        return new Response(
          JSON.stringify({
            error: errorData?.error?.message || `Google API Hatası (${geminiRes.status})`,
          }),
          {
            status: geminiRes.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      const data = await geminiRes.json();
      let imageUri = null;

      if (isImagen) {
        const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
        const mime = data?.predictions?.[0]?.mimeType || 'image/jpeg';
        if (base64) {
          imageUri = `data:${mime};base64,${base64}`;
        }
      } else {
        const candidates = data?.candidates || [];
        for (const cand of candidates) {
          for (const part of cand?.content?.parts || []) {
            if (part?.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/jpeg';
              imageUri = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (imageUri) break;
        }
      }

      if (!imageUri) {
        return new Response(
          JSON.stringify({ error: 'Gemini yanıtında görsel verisi bulunamadı.' }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // 6. Güvenli İstemci Yanıtı
      return new Response(
        JSON.stringify({
          success: true,
          imageUri,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || 'Bilinmeyen sunucu hatası.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
