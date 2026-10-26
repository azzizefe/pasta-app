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

// ==========================================
// PROMPT INJECTION & XSS SHIELD (EDGE LAYER)
// ==========================================
const MAX_PROMPT_LENGTH = 500;
const SUSPICIOUS_PROMPT_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /system\s+prompt/i,
  /reveal\s+(your\s+)?(api[_\s-]?key|secret|system\s+instructions)/i,
  /print\s+(your\s+)?(api[_\s-]?key|secret)/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /tüm\s+talimatlar[ıi]\s+unut/i,
  /sistem\s+talimatlar[ıi]n[ıi]\s+yaz/i,
  /api\s+anahtar[ıi]n[ıi]\s+(ver|yaz|göster)/i,
];

function validateAndSanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Geçersiz veya boş prompt parametresi.' };
  }

  // DoS / Buffer Overflow engelleme
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Pasta açıklaması maksimum ${MAX_PROMPT_LENGTH} karakter olabilir.`,
    };
  }

  // Jailbreak taraması
  for (const pattern of SUSPICIOUS_PROMPT_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        valid: false,
        error: 'Güvenlik ilkeleri gereği bu metin işlenemedi.',
      };
    }
  }

  // HTML / XSS taglerini temizle
  const sanitized = prompt.replace(/<[^>]*>?/gm, '').trim();
  return { valid: true, sanitized };
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

    // 2. RevenueCat Webhook Uç Noktası (Yetkili)
    if (request.method === 'POST' && url.pathname === '/api/revenuecat-webhook') {
      try {
        // GÜVENLİK: Webhook Secret Yetkilendirme Kontrolü
        const authHeader = request.headers.get('Authorization');
        const webhookSecret = env.REVENUECAT_WEBHOOK_SECRET;
        if (webhookSecret) {
          if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
            return new Response(JSON.stringify({ error: 'UNAUTHORIZED_WEBHOOK_CALL' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
          }
        }

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

    // 3. Yalnızca POST /api/generate-cake ve POST /api/generate-recipe isteklerine izin ver
    if (
      request.method !== 'POST' ||
      (url.pathname !== '/api/generate-cake' && url.pathname !== '/api/generate-recipe')
    ) {
      return new Response(JSON.stringify({ error: 'Endpoint bulunamadı' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

      // ==========================================
      // TARİF ÜRETİMİ (Gemini 3.1 Flash Lite)
      // ==========================================
      if (url.pathname === '/api/generate-recipe') {
        const promptCheck = validateAndSanitizePrompt(body?.prompt);
        if (!promptCheck.valid) {
          return new Response(JSON.stringify({ error: promptCheck.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        const prompt = promptCheck.sanitized;
        const details = body?.details || {};
        const recipeModel = body?.model || 'gemini-3.1-flash-lite';
        const maxTokens = Math.min(body?.maxOutputTokens || 10000, 10000);

        const flavor = details.flavor || 'Klasik Vanilya & Pastacı Kreması';
        const guests = details.guests ? `${details.guests} kişilik` : '10-12 kişilik';
        const tier = details.tier ? `${details.tier} katlı` : 'Tek katlı';
        const fillings = details.fillingTags?.length ? details.fillingTags.join(', ') : 'Gourmet krema & taze meyve';
        const coating = details.coating || 'Hafif vanilyalı krema kaplama';

        const recipePrompt = `Sen haute pâtisserie alanında ödüllü bir baş pastacısın.
Kullanıcının tasarladığı ve üretilen fotoğraftaki pastanın BİREBİR AYNISINI ev mutfağında sıfırdan yapabilmesi için 5.000 İLE 10.000 TOKEN ARASINDA ÇOK DETAYLI, EKSİKSİZ BİR MASTERCLASS REHBERİ HAZIRLA:
- Tasarım: ${prompt}
- Porsiyon: ${guests}, Kat: ${tier}, Lezzet: ${flavor}, Dolgu: ${fillings}, Kaplama: ${coating}

ZORUNLU BÖLÜMLER:
1. ALINMASI GEREKENLER & ALIŞVERİŞ LİSTESİ (Süpermarket malzemeleri + pastacılık toptancısı özel ürünleri + çember, duy, spatula gibi gerekli ekipmanlar).
2. PANDİSPANYA / KEKİN HAZIRLANIŞI (Kaç adet yumurta konmalı, un/şeker gramajı, fırın derecesi ve süresi, çökmeden kabarma püf noktaları).
3. İPEKSİ İÇ KREMA VE DOLGULARIN YAPILIŞI (Pişirme, kıvam tutturma, kesilmeme sırrı).
4. DIŞ SIVAMA VE KAPLAMA KREMASI (Keskin kenarlar, pürüzsüzlük).
5. ADIM ADIM MONTAJ (Islatma şurubu, katlandırma, crumb coat ve final coat).
6. FOTOĞRAFTAKİ PASTAYLA BİREBİR AYNI SÜSLEME VE DEKORASYON (Renk tonları, çiçekler, drip, varak, figürler, duy uçları ve süsleme teknikleri).
7. USTA ŞEFTEN ALTIN PÜF NOKTALARI VE SERVİS.

Kurallar: Türkçe, samimi ve profesyonel üslup, Markdown formatı. ÇIKTI UZUNLUĞU: Asla özet veya kısa tutma; 5.000 ile 10.000 token aralığında tüm detayları, ölçüleri ve teknikleri eksiksiz doldur.`;

        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${recipeModel}:generateContent?key=${apiKey}`;
        const googleResponse = await fetch(googleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: recipePrompt }] }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.7,
            },
          }),
        });

        if (!googleResponse.ok) {
          const err = await googleResponse.json().catch(() => ({}));
          return new Response(JSON.stringify({ error: err?.error?.message || `Google API Hatası (${googleResponse.status})` }), {
            status: googleResponse.status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        const data = await googleResponse.json();
        const recipeText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        // ZERO-CLOUD STORAGE: Sunucu tarifi diske/veritabanına kaydetmez, doğrudan kullanıcının cihazına iletir.
        return new Response(JSON.stringify({ success: true, recipe: recipeText?.trim() || '' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'X-Zero-Cloud-Storage': 'true',
          },
        });
      }

      const promptCheck = validateAndSanitizePrompt(body?.prompt);
      if (!promptCheck.valid) {
        return new Response(
          JSON.stringify({ error: promptCheck.error }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      const prompt = promptCheck.sanitized;
      const model = body?.model || 'gemini-nano-banana-2.1';
      const referenceImageBase64 = body?.referenceImageBase64;
      const imageSize = body?.imageSize === '4K' ? '4K' : '2K';

      // 4. Pastacılık Kalite & Çok Modlu (Multimodal) Prompt Enjeksiyonu
      const multimodalGuidance = referenceImageBase64
        ? ' EXTREMELY IMPORTANT MULTIMODAL INSTRUCTION: Carefully examine the attached inspiration photo (such as fabric texture, color palette, graphic motif, or stationery style). Harmoniously incorporate its exact color palette, motifs, textures, and aesthetic styling into the cake decorations, frosting, and presentation without adding extraneous unrequested items.'
        : '';

      const lowerPrompt = prompt.toLocaleLowerCase('tr-TR');
      const mentionsFlowers =
        lowerPrompt.includes('çiçek') ||
        lowerPrompt.includes('cicek') ||
        lowerPrompt.includes('gül') ||
        lowerPrompt.includes('gul') ||
        lowerPrompt.includes('papatya') ||
        lowerPrompt.includes('orkide') ||
        lowerPrompt.includes('floral') ||
        lowerPrompt.includes('flower') ||
        lowerPrompt.includes('rose') ||
        lowerPrompt.includes('blossom') ||
        lowerPrompt.includes('şakayık') ||
        lowerPrompt.includes('sakayik') ||
        lowerPrompt.includes('botanik');

      const flowerConstraint = mentionsFlowers
        ? ''
        : ' CRITICAL NEGATIVE CONSTRAINT - NO FLOWERS: Flowers are NOT requested in the prompt. Do NOT add any flowers, sugar flowers, edible roses, floral accents, petals, leaves, or botanical decorations anywhere on or around the cake. The cake surface must remain completely free of flowers.';

      const enhancedPrompt = `Professional high-end gourmet culinary food photography of an exquisite handcrafted cake: ${prompt}.${multimodalGuidance} Studio lighting, award-winning pastry chef presentation, hyperrealistic texture, clean elegant background, shallow depth of field, 8k resolution. STRICT FIDELITY RULE: Adhere 100% strictly and exclusively to the user description. Do NOT add any unrequested decorations, unrequested toppings, unrequested pearls, unrequested figurines, or unrequested embellishments. Only depict what is explicitly written in the prompt.${flowerConstraint} KATI KURAL: Yazılanların kesinlikle dışına çıkma; metinde belirtilmeyen hiçbir süsleme, çiçek veya detayı ekleme.`;

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
              imageSize,
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

      // 6. Güvenli İstemci Yanıtı (ZERO-CLOUD STORAGE: Görsel sunucuda depolanmaz, doğrudan istemciye aktarılır)
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
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'X-Zero-Cloud-Storage': 'true',
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
