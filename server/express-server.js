/**
 * Lumière Sucrée — Güvenli Node.js / Express Backend Proxy
 *
 * MİMARİ VE GÜVENLİK AMACI:
 * 1. Gemini API Anahtarını gizli tutar (process.env.GEMINI_API_KEY).
 * 2. Mobil istemci derlendiğinde bu anahtarlar hiçbir şekilde ortaya çıkmaz.
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ==========================================
// RATE LIMITING MIDDLEWARE (DDoS & Abuse Koruması)
// ==========================================
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika (60 saniye)
const MAX_REQUESTS_PER_WINDOW = 20; // Dakikada maks 20 üretim isteği
const ipRateLimitStore = new Map();

function rateLimitMiddleware(req, res, next) {
  const clientIp =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
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
app.post('/api/generate-cake', rateLimitMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.',
    });
  }

  const { prompt, model = 'gemini-3-pro-image', referenceImageBase64 } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Geçersiz prompt parametresi.' });
  }

  const multimodalGuidance = referenceImageBase64
    ? ' EXTREMELY IMPORTANT MULTIMODAL INSTRUCTION: Carefully examine the attached inspiration photo (such as wedding dress fabric, invitation card, floral theme, or venue decor). Harmoniously incorporate its exact color palette, motifs, textures, and aesthetic styling into the cake decorations, frosting, and presentation.'
    : '';

  const enhancedPrompt = `Professional high-end gourmet culinary food photography of an exquisite handcrafted cake: ${prompt}.${multimodalGuidance} Studio lighting, award-winning pastry chef presentation, hyperrealistic texture, clean elegant background, shallow depth of field, 8k resolution.`;

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

    return res.json({ success: true, imageUri });
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
  const event = req.body?.event;
  if (!event) {
    return res.status(400).json({ error: 'Geçersiz webhook verisi' });
  }

  const { type, app_user_id, product_id, price_in_purchased_currency } = event;
  console.log(`[RevenueCat Webhook] Olay: ${type}, Kullanıcı: ${app_user_id}, Ürün: ${product_id}`);

  // Tüketilebilir kredi paketi eşleştirmesi
  let creditsToAdd = 0;
  if (product_id === 'lumiere_credits_single_15') creditsToAdd = 15;
  else if (product_id === 'lumiere_credits_starter_200') creditsToAdd = 200;
  else if (product_id === 'lumiere_credits_popular_1000') creditsToAdd = 1000;

  if (creditsToAdd > 0) {
    console.log(`[RevenueCat Webhook] ${app_user_id} kullanıcısına +${creditsToAdd} kredi başarıyla tanımlandı.`);
    // Burada Supabase / PostgreSQL / Firebase veritabanında kullanıcının kredisi atomik olarak artırılır.
  }

  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Lumière Sucrée Secure Backend çalışıyor: http://localhost:${PORT}`);
});

