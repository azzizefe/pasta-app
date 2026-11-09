/**
 * Lumière Sucrée — Güvenli Node.js / Express Backend Proxy
 *
 * MİMARİ VE GÜVENLİK AMACI:
 * 1. Gemini API Anahtarını gizli tutar (process.env.GEMINI_API_KEY).
 * 2. Mobil istemci derlendiğinde bu anahtarlar hiçbir şekilde ortaya çıkmaz.
 */

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

const app = express();
// Sunucu Nginx arkasında çalışır: gerçek istemci IP'si sadece aynı makinedeki
// Nginx'in eklediği başlıktan okunur (istemcinin uydurduğu başlıklara güvenilmez).
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Model ve token sınırı sunucuda seçilir (/etc/lumiere-api.env). Uygulamanın gönderdiği
// model dikkate alınmaz; böylece model değiştirmek için uygulama güncellemesi gerekmez.
const IMAGE_MODEL_SETTING = process.env.GEMINI_IMAGE_MODEL;
const RECIPE_MODEL_SETTING = process.env.GEMINI_RECIPE_MODEL;
const RECIPE_MAX_TOKENS_SETTING = process.env.GEMINI_RECIPE_MAX_TOKENS;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// ==========================================
// PROMPT INJECTION KORUMASI (ayrıntılar: prompt-guard.js)
// ==========================================
const {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_RECIPE_MODEL,
  guardText,
  guardCakeDetails,
  configuredModel,
  resolveMaxTokens,
  guardReferenceImage,
  buildImagePrompt,
  buildRecipeRequest,
  buildPromptEnhanceRequest,
  finishEnhancedPrompt,
  guardModelOutput,
} = require('./prompt-guard');
const { creditStorePurchase } = require('./store-credits');

/** Doğrulama hatasını 400 olarak döndürür (hangi kalıba takıldığını istemciye söylemez). */
function sendGuardError(res, result) {
  if (result.reason) console.warn(`[PromptGuard] Engellendi: ${result.code} ${result.field || ''} ${result.reason}`);
  return res.status(400).json({ error: result.message, code: result.code });
}

/** Tüm üretim isteklerinde açıklama metnini doğrular ve temizler. */
function promptSecurityMiddleware(req, res, next) {
  const check = guardText(req.body?.prompt, { required: true });
  if (!check.ok) return sendGuardError(res, check);
  req.body.prompt = check.value;
  next();
}

// ==========================================
// RATE LIMITING MIDDLEWARE (DDoS & Abuse Koruması)
// ==========================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika (60 saniye)
const MAX_REQUESTS_PER_WINDOW = 20; // Dakikada maks 20 üretim isteği
const ipRateLimitStore = new Map();

function rateLimitMiddleware(req, res, next) {
  const clientIp =
    req.ip ||
    req.socket.remoteAddress ||
    'anonymous';

  const now = Date.now();
  const entry = ipRateLimitStore.get(clientIp);

  // Süresi geçmiş kayıtları temizle
  if (ipRateLimitStore.size > 10000) {
    for (const [key, val] of ipRateLimitStore.entries()) {
      if (now > val.resetTime) {
        ipRateLimitStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    ipRateLimitStore.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS_PER_WINDOW - 1);
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', 0);
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla pasta tasarım isteği gönderildi. Lütfen 1 dakika sonra tekrar deneyin (Maks. 20 istek/dk).',
      retryAfter,
    });
  }

  entry.count += 1;
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS_PER_WINDOW - entry.count);
  next();
}

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Lumiere Sucree Secure Backend' });
});

/**
 * 1. GÜVENLİ GEMINI AI PASTA ÜRETİMİ
 * POST /api/generate-cake
 * Body: { prompt: string, model?: string }
 */
app.post('/api/generate-cake', rateLimitMiddleware, promptSecurityMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.',
    });
  }

  const { prompt } = req.body;
  const imageCheck = guardReferenceImage(req.body.referenceImageBase64);
  if (!imageCheck.ok) return sendGuardError(res, imageCheck);

  const model = configuredModel(IMAGE_MODEL_SETTING, DEFAULT_IMAGE_MODEL);
  const referenceImageBase64 = imageCheck.data;
  const imageSize = req.body.imageSize === '4K' ? '4K' : '2K';
  // Kullanıcı metni talimatlardan ayrılmış şekilde prompt'a girer.
  const enhancedPrompt = buildImagePrompt(prompt, Boolean(referenceImageBase64));

  try {
    const isImagen = model.toLowerCase().startsWith('imagen');
    let googleUrl = '';
    let payload = {};

    if (isImagen) {
      googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`;
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
      googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const parts = [{ text: enhancedPrompt }];
      if (referenceImageBase64) {
        parts.push({
          inlineData: {
            mimeType: imageCheck.mimeType,
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

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (OPENAI_API_KEY) {
        console.log('[Express] Gemini API yanıt vermedi, Yedek Sağlayıcı (OpenAI DALL-E 3) devreye alınıyor...');
        try {
          const openAiRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`,
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
              return res.json({
                success: true,
                imageUri: `data:image/png;base64,${b64}`,
                provider: 'openai-dalle-3-fallback',
              });
            }
          }
        } catch (fbErr) {
          console.warn('[Express] Yedek sağlayıcı hatası:', fbErr);
        }
      }

      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || `Google API Hatası (${response.status})`,
      });
    }

    const data = await response.json();
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
      return res.status(502).json({ error: 'Gemini yanıtında görsel verisi bulunamadı.' });
    }

    // ZERO-CLOUD STORAGE: Sunucu görseli diske veya veritabanına kaydetmez; doğrudan istemciye iletir.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Zero-Cloud-Storage': 'true',
    });
    return res.json({ success: true, imageUri });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Sunucu hatası oluştu.' });
  }
});


/**
 * 2. GÜVENLİ GEMINI 3.1 FLASH LITE PASTA TARİFİ ÜRETİMİ (Kendi Pastanı Oluştur)
 * POST /api/generate-recipe
 * Body: { prompt: string, details?: object, language?: "tr" | "en" | "fr" | "ar" }
 */
app.post('/api/generate-recipe', rateLimitMiddleware, promptSecurityMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.',
    });
  }

  const detailsCheck = guardCakeDetails(req.body.details);
  if (!detailsCheck.ok) return sendGuardError(res, detailsCheck);

  const model = configuredModel(RECIPE_MODEL_SETTING, DEFAULT_RECIPE_MODEL);
  const maxOutputTokens = resolveMaxTokens(RECIPE_MAX_TOKENS_SETTING);
  const { systemInstruction, userText } = buildRecipeRequest(req.body.prompt, detailsCheck.value, req.body.language);

  try {
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          maxOutputTokens,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || `Google API Hatası (${response.status})`,
      });
    }

    const data = await response.json();
    const recipeText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    const outputCheck = guardModelOutput(recipeText);
    if (!outputCheck.ok) {
      console.warn(`[PromptGuard] Model çıktısı reddedildi: ${outputCheck.code}`);
      return res.status(502).json({ error: outputCheck.message, code: outputCheck.code });
    }

    // ZERO-CLOUD STORAGE: Sunucu tarifi diske veya veritabanına kaydetmez; doğrudan istemciye iletir.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Zero-Cloud-Storage': 'true',
    });
    return res.json({ success: true, recipe: outputCheck.value });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Sunucu hatası oluştu.' });
  }
});

/**
 * İSTEM İYİLEŞTİRME (Gemini 3.1 Flash Lite)
 * POST /api/enhance-prompt
 * Body: { prompt: string, kind?: "wedding" | "engagement" | "birthday" | "custom", language?: string }
 * Kullanıcının kısa pasta fikrini görsel modeli için daha zengin bir tarife çevirir.
 */
app.post('/api/enhance-prompt', rateLimitMiddleware, promptSecurityMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.' });
  }

  const model = configuredModel(RECIPE_MODEL_SETTING, DEFAULT_RECIPE_MODEL);
  const { systemInstruction, userText } = buildPromptEnhanceRequest(
    req.body.prompt,
    { kind: req.body.kind },
    req.body.language,
  );

  try {
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.8 },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: err?.error?.message || `Google API Hatası (${response.status})`,
      });
    }

    const data = await response.json();
    const outputCheck = guardModelOutput(data?.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!outputCheck.ok) {
      console.warn(`[PromptGuard] Model çıktısı reddedildi: ${outputCheck.code}`);
      return res.status(502).json({ error: outputCheck.message, code: outputCheck.code });
    }

    res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate, private', 'X-Zero-Cloud-Storage': 'true' });
    return res.json({ success: true, prompt: finishEnhancedPrompt(outputCheck.value) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Sunucu hatası oluştu.' });
  }
});

/**
 * 3. GÜVENLİ REVENUECAT IAP WEBHOOK
 * POST /api/revenuecat-webhook
 * Apple App Store ve Google Play satın alımları RevenueCat tarafından buraya post edilir.
 */
app.post('/api/revenuecat-webhook', async (req, res) => {
  // GÜVENLİK: Sır tanımlı değilse webhook kapalıdır; hiçbir istek kabul edilmez.
  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.warn('[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET tanımlı değil, istek reddedildi.');
    return res.status(503).json({ error: 'WEBHOOK_NOT_CONFIGURED' });
  }
  const expected = Buffer.from(`Bearer ${REVENUECAT_WEBHOOK_SECRET}`);
  const received = Buffer.from(String(req.headers.authorization || ''));
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    console.warn('[RevenueCat Webhook] Yetkisiz webhook isteği engellendi.');
    return res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK_CALL' });
  }
  const event = req.body?.event;
  if (!event) {
    return res.status(400).json({ error: 'Geçersiz webhook verisi' });
  }

  console.log(`[RevenueCat Webhook] Olay: ${event.type}, Kullanıcı: ${event.app_user_id}, Ürün: ${event.product_id}`);

  // Satın alınan krediyi kullanıcının Supabase cüzdanına tanımlar (store-credits.js).
  const { status, body } = await creditStorePurchase(event);
  res.status(status).json(body);
});

// HOST=127.0.0.1 ile sadece Nginx erişebilir (Docker için varsayılan 0.0.0.0).
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  if (!GEMINI_API_KEY) console.warn('UYARI: GEMINI_API_KEY tanımlı değil, üretim istekleri çalışmayacak.');
  console.log(
    `Modeller — görsel: ${configuredModel(IMAGE_MODEL_SETTING, DEFAULT_IMAGE_MODEL)}, ` +
      `tarif: ${configuredModel(RECIPE_MODEL_SETTING, DEFAULT_RECIPE_MODEL)} ` +
      `(maks. ${resolveMaxTokens(RECIPE_MAX_TOKENS_SETTING)} token)`,
  );
  console.log(`Lumière Sucrée Secure Backend çalışıyor: http://${HOST}:${PORT}`);
});

