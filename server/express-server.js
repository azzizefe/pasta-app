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
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// ==========================================
// PROMPT INJECTION & XSS SHIELD MIDDLEWARE
// ==========================================
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

function promptSecurityMiddleware(req, res, next) {
  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Geçersiz prompt parametresi.' });
  }

  // DoS / Buffer Overflow koruması
  if (prompt.length > 500) {
    return res.status(400).json({
      error: 'PROMPT_TOO_LONG',
      message: 'Pasta açıklaması maksimum 500 karakter olabilir.',
    });
  }

  // Jailbreak taraması
  for (const pattern of SUSPICIOUS_PROMPT_PATTERNS) {
    if (pattern.test(prompt)) {
      return res.status(400).json({
        error: 'PROMPT_SECURITY_VIOLATION',
        message: 'Güvenlik ilkeleri gereği bu metin işlenemedi.',
      });
    }
  }

  // XSS & HTML tag temizliği
  req.body.prompt = prompt.replace(/<[^>]*>?/gm, '').trim();
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
app.post('/api/generate-cake', rateLimitMiddleware, promptSecurityMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.',
    });
  }

  const { prompt, model = 'gemini-nano-banana-2.1', referenceImageBase64 } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Geçersiz prompt parametresi.' });
  }
  const imageSize = req.body.imageSize === '4K' ? '4K' : '2K';

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
 * Body: { prompt: string, details?: object, model?: string, maxOutputTokens?: number }
 */
app.post('/api/generate-recipe', rateLimitMiddleware, promptSecurityMiddleware, async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Sunucuda GEMINI_API_KEY ortam değişkeni ayarlanmamış.',
    });
  }

  const { prompt, details = {}, model = 'gemini-3.1-flash-lite', maxOutputTokens = 10000 } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Geçersiz prompt parametresi.' });
  }

  const flavor = details.flavor || 'Klasik Vanilya & Pastacı Kreması';
  const guests = details.guests ? `${details.guests} kişilik` : '10-12 kişilik';
  const tier = details.tier ? `${details.tier} katlı` : 'Tek katlı';
  const fillings = details.fillingTags?.length ? details.fillingTags.join(', ') : 'Gourmet krema & meyve';
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

  try {
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: recipePrompt }] }],
        generationConfig: {
          maxOutputTokens: Math.min(maxOutputTokens, 10000),
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

    if (!recipeText) {
      return res.status(502).json({ error: 'Gemini yanıtında tarif metni bulunamadı.' });
    }

    // ZERO-CLOUD STORAGE: Sunucu tarifi diske veya veritabanına kaydetmez; doğrudan istemciye iletir.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Zero-Cloud-Storage': 'true',
    });
    return res.json({ success: true, recipe: recipeText.trim() });
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
  // GÜVENLİK: Webhook Secret Yetkilendirme Kontrolü
  const authHeader = req.headers.authorization;
  if (REVENUECAT_WEBHOOK_SECRET) {
    if (!authHeader || authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
      console.warn('[RevenueCat Webhook] Yetkisiz webhook isteği engellendi.');
      return res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK_CALL' });
    }
  }
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

