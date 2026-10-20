# Lumière Sucrée — Güvenli Backend Proxy (BFF Mimarisi)

Bu dizin, mobil uygulamadaki **Google Gemini API** gibi kritik sırların istemci tarafında deşifre edilmesini ve tersine mühendislikle çalınmasını önlemek için geliştirilmiş güvenli proxy servislerini içerir.

---

## Neden Bu Mimari Zorunludur?

React Native / Expo derlendiğinde (`.apk`, `.aab`, `.ipa` veya Web bundle):
- `EXPO_PUBLIC_` değişkenleri doğrudan derlenmiş paketin içerisine açık metin olarak gömülür.
- Kötü niyetli bir kullanıcı `strings index.android.bundle` veya Charles Proxy/Wireshark ile Gemini anahtarınızı 5 saniyede çıkarabilir.
- **Çözüm:** Mobil uygulama doğrudan Google Gemini API'ye bağlanmaz; **bu güvenli backend proxy'sine** bağlanır.

---

## 1. Seçenek: Cloudflare Worker (Önerilen — Ücretsiz & Sunucusuz)

Cloudflare Workers, dünyanın dört bir yanındaki Edge sunucularında sıfır gecikmeyle çalışır.
**Maliyet:** Günde 100.000 istek **tamamen ücretsizdir**.

### Adım Adım Kurulum (3 Dakika):
1. [Cloudflare Dashboard](https://dash.cloudflare.com/)'a ücretsiz giriş yapın.
2. Sol menüden **Workers & Pages** -> **Create Application** -> **Create Worker** butonuna basın.
3. Bir isim verin (Örn: `lumieresucree-ai-proxy`) ve **Deploy** deyin.
4. **Edit code** butonuna basarak içindeki kodu silin ve [cloudflare-worker.js](file:///c:/Users/efe/Desktop/pasta-app/server/cloudflare-worker.js) dosyasının içeriğini yapıştırıp **Save and deploy** deyin.
5. **Settings** -> **Variables and Secrets** sekmesine gidin:
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** Google AI Studio'dan aldığınız API anahtarı
   - **Type:** *Secret (Encrypt)* seçeneğini işaretleyip kaydedin.
6. Worker'ınızın URL'ini kopyalayın (Örn: `https://lumieresucree-ai-proxy.workers.dev`).
7. Mobil projenizin [.env](file:///c:/Users/efe/Desktop/pasta-app/.env) dosyasını açıp ekleyin:
   ```env
   EXPO_PUBLIC_AI_BACKEND_URL=https://lumieresucree-ai-proxy.workers.dev
   ```

Artık mobil uygulamanız Gemini API'ye bu güvenli Edge sunucusu üzerinden erişecek; telefonun içinde tek bir API anahtarı dahi bulunmayacaktır!

---

## 2. Seçenek: Node.js / Express Sunucusu

Eğer kendi sunucunuzda (Render, Railway, Fly.io, AWS, DigitalOcean vb.) çalıştırmak isterseniz:

### Kurulum:
```bash
cd server
npm install express cors
```

### Çalıştırma:
```bash
GEMINI_API_KEY="AIzaSy..." node express-server.js
```

### .env Yapılandırması:
```env
EXPO_PUBLIC_AI_BACKEND_URL=https://api.lumieresucree.app
```

---

## Mimari Akış Şeması

```
[Mobil İstemci (Lumière Sucrée)]
         │
         │ 1. POST /api/generate-cake (Sadece pasta prompt'u gönderilir)
         ▼
[Güvenli Edge / Backend Proxy] ── GEMINI_API_KEY sunucu env'sinde şifreli
         │
         │ 2. Sunucudan Google Gemini 3 Pro (Nano Banana Pro) API'sine çağrı
         ▼
[Google Gemini API]
         │
         │ 3. 2K/8K Kalitede Base64 Fotoğraf Yanıtı
         ▼
[Güvenli Edge / Backend Proxy]
         │
         │ 4. { success: true, imageUri: "..." }
         ▼
[Mobil İstemci]
```
