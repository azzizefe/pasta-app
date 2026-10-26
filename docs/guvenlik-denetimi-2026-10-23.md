# Lumière Sucrée — Yayın Öncesi Güvenlik Denetimi

**Tarih:** 23 Ekim 2026
**Kapsam:** Mobil uygulama (`src/`, `App.tsx`), yapay zekâ sunucuları (`server/cloudflare-worker.js`, `server/express-server.js`), veritabanı şemaları (`supabase/*.sql`), yapılandırma (`app.json`, `eas.json`, `.env`) ve bağımlılıklar (`package.json`, `package-lock.json`)
**Yöntem:** Trail of Bits güvenlik skill'leri ([github.com/trailofbits/skills](https://github.com/trailofbits/skills))

> ⚠️ Bu belge uygulamanın istismar edilebilir açıklarını anlatır. Depo herkese açık olacaksa bu dosyayı paylaşmayın veya açıklar kapatılana kadar depodan çıkarın.

---

## 1. Kısa özet

**Sonuç: Uygulama bu haliyle yayına hazır değil.** Para kaybına yol açabilecek 4 kritik ve 5 yüksek önemde açık var. Hepsinin ortak kökü aynı: **güvenlik kararları telefonda veriliyor, sunucuda değil.** Kredi bakiyesi, satın alma onayı, giriş ve yapay zekâ anahtarı şu an uygulamanın içinde. Uygulamayı kurcalayan biri bunların hepsini atlatabilir.

| Önem | Sayı | Anlamı |
|---|---|---|
| 🔴 Kritik | 4 | Doğrudan para kaybı veya sınırsız ücretsiz kullanım. Yayından önce mutlaka kapatılmalı. |
| 🟠 Yüksek | 5 | Kolay istismar edilir veya mağaza reddine yol açar. Yayından önce kapatılmalı. |
| 🟡 Orta | 6 | Belirli koşullarda zarar verir. İlk güncellemeye kadar kapatılmalı. |
| 🟢 Düşük | 9 | İyileştirme / sağlamlaştırma. |

**Önce yapılacak 5 iş:**
1. Gemini anahtarını uygulamadan çıkarıp sunucuya taşı, eski anahtarı iptal et (K1).
2. Sunucuya giriş kontrolü ve sunucu taraflı kredi düşme ekle (K4, Y1).
3. Veritabanındaki iki açığı kapat: profil güncelleme (K2) ve negatif kredi düşme (K3).
4. Satın almaları sunucuda RevenueCat üzerinden doğrula (Y2).
5. Sahte Google girişini ve Android'deki taklit Apple girişini kaldır (Y3).

---

## 2. Yöntem

Trail of Bits deposundaki skill'lerden bu projeye uyanlar kullanıldı:

| Skill | Ne için kullanıldı | Not |
|---|---|---|
| **sharp-edges** | Tehlikeli varsayılanlar, sessiz hatalar, tek ayarla güvenliği bozan yapılandırmalar | Sunucu, veritabanı ve yapılandırmanın tamamına uygulandı |
| **supply-chain-risk-auditor** | Bağımlılıklardaki bilinen açıklar, terk edilmiş paketler, kurulum betikleri | Betik çalıştırıldı: 29 doğrudan + 519 dolaylı paket tarandı |
| **fp-check** | Her bulgunun gerçekten istismar edilebilir olup olmadığının doğrulanması | Bulgular kaynaktan hedefe izlendi; yanlış alarmlar 6. bölümde |
| **entry-point-analyzer** | Saldırı yüzeyi haritası | Akıllı sözleşmeler için yazılmış; yöntemi bu projenin API'lerine uyarlandı (3. bölüm) |
| **semgrep** | Otomatik statik analiz | Bilgisayarda semgrep kurulu olmadığı için **çalıştırılamadı** |

**Sınırlar:**
- Canlı sistemler test edilmedi. Supabase projesi `.env` içinde tanımlı ama canlı veritabanına istek atılmadı. Veritabanı bulguları SQL dosyalarına göre yazıldı (8. bölümde panelden doğrulanacaklar listesi var).
- Cloudflare sunucusu henüz yayında değil; bulgular koda göre.
- Derlenmiş iOS/Android paketi incelenmedi.

---

## 3. Saldırı yüzeyi haritası

Dışarıdan çağrılabilen ve bir şeyi değiştiren her nokta:

| Giriş noktası | Kim çağırabilir | Ne yapar | Koruma |
|---|---|---|---|
| `POST /api/generate-cake` (worker, express) | **Herkes** (adresi bilen) | Senin hesabınla görsel üretir (para harcar) | Sadece IP başına dakikada 20 istek; giriş kontrolü yok |
| `POST /api/generate-recipe` (worker, express) | **Herkes** | 10.000 token'a kadar metin üretir | Aynı |
| `POST /api/revenuecat-webhook` | Gizli anahtar tanımlıysa RevenueCat; **tanımlı değilse herkes** | Şu an sadece kayıt yazar | İsteğe bağlı gizli anahtar |
| Gemini API (anahtar uygulamada) | **Anahtarı çıkaran herkes** | Her şey | Yok |
| Supabase `profiles` tablosu UPDATE | Giriş yapmış her kullanıcı (kendi satırı) | **Bakiye, rol, ban durumu dahil her sütun** | RLS sadece satır sahipliğine bakıyor |
| Supabase `deduct_user_credits` | Giriş yapmış her kullanıcı | Bakiyeyi değiştirir | Negatif tutar kontrolü yok |
| Supabase `add_user_credits`, `process_store_purchase` | Sadece `service_role` | Kredi yükler | ✅ Yetki kaldırılmış + rol kontrolü |
| Supabase `spend_user_credits` | Giriş yapmış kullanıcı | Kredi düşer | ✅ Negatif tutar engelli |
| Supabase `delete_user_account` | Giriş yapmış kullanıcı | Hesabı siler | ✅ Sadece kendi hesabı |
| Supabase Storage `cake-images` | Okuma: **herkes**; yükleme: giriş yapmış herkes, **her klasöre** | Görsel barındırma | Kısmi |
| Supabase `app_feedback` INSERT | **Giriş yapmamış herkes dahil** | Geri bildirim ekler | Yok |
| Cihazdaki AsyncStorage (krediler, oturum) | Cihaz sahibi | Bakiye ve oturum | Yok |

---

## 4. Bulgular

Her bulgunun yanında fp-check doğrulamasının sonucu yazılıdır: **DOĞRULANDI** (kaynaktan hedefe izlendi, istismar yolu açık) veya **KOŞULLU** (istismar, belirtilen koşul gerçekleşince mümkün).

### 🔴 K1 — Gemini API anahtarı uygulama paketinin içinde

- **Yer:** `src/config/env.ts:9`, `src/services/geminiImageService.ts:280-283`, `src/services/geminiRecipeService.ts:272`
- **Durum:** DOĞRULANDI. `.env` içinde `EXPO_PUBLIC_GEMINI_API_KEY` dolu, `EXPO_PUBLIC_AI_BACKEND_URL` boş. Bu ayarla derlenen uygulama Gemini'ye doğrudan, kendi içindeki anahtarla bağlanır.
- **Ne oluyor:** `EXPO_PUBLIC_` ile başlayan her değer derleme sırasında uygulamanın JavaScript paketine yazılır. App Store'dan indirilen uygulama dosyası açılıp metin olarak aranınca anahtar bulunur.
- **Senaryo:** Biri uygulamayı indirir, paketi açar, `AIza…` ya da benzeri anahtarı bulur. Kendi projelerinde senin hesabınla sınırsız görsel üretir. Fatura sana gelir; Google kotayı doldurunca senin kullanıcıların da üretim yapamaz.
- **Ek sorun (sharp edge — "yapılandırma uçurumu"):** Sunucu adresi boş bırakılırsa uygulama hiçbir uyarı vermeden doğrudan moda geçer. Uyarı sadece geliştirme modunda konsola yazılıyor (`geminiImageService.ts:115-119`). Yani güvenli olmak, birinin bir ayarı hatırlamasına bağlı.
- **Çözüm:**
  1. Cloudflare sunucusunu yayınla, anahtarı `wrangler secret put GEMINI_API_KEY` ile sunucuya koy.
  2. `.env`'den `EXPO_PUBLIC_GEMINI_API_KEY` satırını sil, `EXPO_PUBLIC_AI_BACKEND_URL`'e sunucu adresini yaz.
  3. Google AI Studio'da **eski anahtarı iptal et**, yeni anahtar oluştur (eski anahtar açığa çıkmış sayılmalı).
  4. Kodda doğrudan modu yayın sürümünde tamamen kapat: `!__DEV__ && !hasAIBackend()` ise üretim hata versin, anahtarla devam etmesin.
  5. Google Cloud'da anahtara günlük harcama/kota sınırı koy.

### 🔴 K2 — Kullanıcı kendi kredi bakiyesini, rolünü ve ban durumunu değiştirebilir (Supabase)

> ✅ **Düzeltildi (kodda), 23 Ekim 2026:** `supabase/migrations/20261023_kredi_dusme_guvenligi.sql` ve güncellenen `schema.sql`. Yerel PostgreSQL 17 üzerinde test edildi: bakiye, rol ve ban güncellemesi "permission denied" veriyor, ad değişikliği çalışıyor. **Canlıya uygulanması için yamanın Supabase SQL Editor'da çalıştırılması gerekiyor.**

- **Yer:** `supabase/schema.sql:548-550`
- **Durum:** KOŞULLU — `schema.sql` canlı veritabanına kurulduysa ve bakiye olarak `profiles.credits_balance` kullanılırsa. `.env`'de Supabase adresi ve anahtarı tanımlı, yani şema kurulmuş olabilir.
- **Ne oluyor:** Politika sadece "satır senin mi?" diye bakıyor (`USING (auth.uid() = id)`), hangi sütunun değiştirildiğine bakmıyor. Supabase varsayılan olarak giriş yapmış kullanıcılara tablonun tüm sütunlarında UPDATE yetkisi verir.
- **Senaryo:** Kullanıcı uygulamadaki herkese açık Supabase anahtarı ve kendi oturumuyla tek bir istek atar: `credits_balance = 999999`, `role = 'admin'`, `is_banned = false`. Sınırsız kredi, yönetici rolü ve ban kaldırma.
- **Çözüm:**
  ```sql
  -- Hassas sütunlarda güncellemeyi kapat, sadece güvenli sütunlara izin ver
  REVOKE UPDATE ON public.profiles FROM anon, authenticated;
  GRANT UPDATE (full_name, avatar_url, preferred_language, push_token)
    ON public.profiles TO authenticated;

  DROP POLICY "Kullanıcılar kendi profillerini güncelleyebilir" ON public.profiles;
  CREATE POLICY "Kullanıcılar kendi profillerini güncelleyebilir"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  ```
  Ayrıca bakiyeyi `profiles` içinde tutmak yerine tek bir yerde (`user_wallets`) tutun; bu tablo zaten doğru korunuyor (bkz. O5).

### 🔴 K3 — `deduct_user_credits` negatif tutarla çağrılınca kredi ekliyor

> ✅ **Düzeltildi (kodda), 23 Ekim 2026:** Tutarı artık veritabanı belirliyor (`generation_cost`); açıklı eski fonksiyon siliniyor; bakiye 0 veya yetersizse harcama reddediliyor; bakiye ve harcama kayıtları için eksi değer kuralları eklendi. Uygulama tarafında da eksi/geçersiz tutar reddediliyor ve kredi düşülemezse görsel üretilmiyor. Yerel PostgreSQL 17'de istismar önce yeniden üretildi (bakiye 50 → 1.000.050), yamadan sonra kapandığı doğrulandı. **Canlıya uygulanması için yamanın Supabase SQL Editor'da çalıştırılması gerekiyor.**

- **Yer:** `supabase/schema.sql:336-400`
- **Durum:** KOŞULLU (K2 ile aynı koşul). Kod yolu izlendi: `p_cost` için alt sınır kontrolü yok; fonksiyonun çalıştırma yetkisi kaldırılmamış (Postgres'te yeni fonksiyonlar varsayılan olarak herkese açıktır).
- **Senaryo:** Giriş yapmış kullanıcı `deduct_user_credits(p_cost := -1000000, ...)` çağırır. `bakiye < -1000000` koşulu yanlış olduğu için harcama "onaylanır", yeni bakiye `bakiye + 1.000.000` olur.
- **Karşılaştırma:** Aynı işi yapan `spend_user_credits` (`credits_and_purchases.sql:268`) bu kontrolü yapıyor; `deduct_user_credits` yapmıyor.
- **Çözüm:**
  ```sql
  -- Fonksiyonun başına:
  IF p_cost IS NULL OR p_cost <= 0 OR p_cost > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_COST');
  END IF;
  ```
  Daha iyisi: tutarı istemciden hiç almayın. Kredi düşmeyi sadece sunucu yapsın (`REVOKE EXECUTE ... FROM authenticated`), maliyeti de sunucu belirlesin.

### 🔴 K4 — Yapay zekâ sunucusunda giriş kontrolü ve kredi kontrolü yok

- **Yer:** `server/cloudflare-worker.js:161-215`, `server/express-server.js:127, 297`
- **Durum:** DOĞRULANDI. Üretim uç noktalarına giden yolda kimlik doğrulama veya bakiye kontrolü yapan tek satır yok.
- **Ne oluyor:** Sunucu adresi uygulamanın içinde olacak (gizli değil). Adresi bilen herkes, kullanıcı olmadan ve kredi harcamadan istek atabilir. Tek koruma IP başına dakikada 20 istek (ve o da zayıf, bkz. O1).
- **Senaryo:** Biri sunucu adresini bulur, IP değiştirerek (VPN, bulut makineleri) dakikada yüzlerce 4K görsel üretir. K1 kapatılsa bile fatura aynı şekilde şişer.
- **Çözüm:**
  1. Uygulama her istekte Supabase oturum belirtecini (`Authorization: Bearer <jwt>`) göndersin.
  2. Sunucu belirteci Supabase'in açık anahtarıyla doğrulasın; geçersizse 401.
  3. Sunucu, üretimden **önce** `service_role` ile krediyi düşsün; üretim başarısız olursa iade etsin.
  4. Kullanıcı başına (IP değil) günlük üst sınır koysun.

### 🟠 Y1 — Krediler sadece telefonda tutuluyor

- **Yer:** `src/context/CreditsContext.tsx:14-15, 57-77, 107-129`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:** Bakiye AsyncStorage'da düz bir sayı olarak duruyor ve sunucu bunu hiç bilmiyor.
- **Senaryolar:**
  - Uygulamayı silip yeniden kur: iOS'ta AsyncStorage silinir, bakiye yeniden 25 olur. Sonsuz ücretsiz kredi.
  - Web sürümünde tarayıcı geliştirici araçlarından `@lumiere_user_credits_v1` değerini 99999 yap.
  - Jailbreak/root'lu cihazda dosyayı düzenle.
- **Çözüm:** Bakiye Supabase `user_wallets` tablosunda tutulsun; uygulama sadece göstersin. Kredi düşme/ekleme yalnızca sunucuda olsun (K4 ile birlikte).

### 🟠 Y2 — Satın almalar sunucuda doğrulanmıyor

- **Yer:** `src/services/iapService.ts:121-131`, `server/express-server.js:392-401`, `server/cloudflare-worker.js:146-152`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:** Mağaza "başarılı" deyince uygulama krediyi kendi kendine ekliyor. İşlem numarası gerçek değil (`rc_${Date.now()}`). Webhook gelen olayı sadece konsola yazıyor, krediyi veritabanına eklemiyor (kodda "burada artırılır" yorumu var ama kod yok).
- **Etkisi:** Krediler telefonda olduğu için satın alma da aynı şekilde atlatılabilir. Ayrıca iade edilen satın almalarda kredi geri alınamaz; kullanıcı başka cihaza geçince satın aldığı krediyi kaybeder.
- **Çözüm:**
  1. RevenueCat'i Supabase kullanıcı kimliğiyle başlat (`appUserID`).
  2. Webhook'ta RevenueCat olayını al, ürün kimliğinden kredi miktarını **sunucuda** belirle, `process_store_purchase`'ı `service_role` ile çağır (bu fonksiyon zaten doğru yazılmış: tekrar işlemeyi engelliyor).
  3. `CANCELLATION`/`REFUND` olaylarında krediyi geri al.
  4. Uygulama kendi kendine kredi eklemesin, sunucudan güncel bakiyeyi okusun.

### 🟠 Y3 — Sahte giriş: Google butonu ve Android'deki Apple girişi

- **Yer:** `src/screens/LoginScreen.tsx:104-112, 169-175`, `src/services/appleAuthService.ts:39-50`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:**
  - "Sign in with Google" butonu hiçbir doğrulama yapmadan herkesi aynı demo kullanıcı yapıyor (`google_user_demo`, sabit ad ve e-posta).
  - Android'de (ve web'de) "Apple ile giriş" her zaman başarılı dönüyor; `identityToken: 'simulated_jwt_token'` sahte. Apple butonu Android'de de gösteriliyor.
- **Etkisi:** Uygulamada gerçek bir kullanıcı kimliği yok. Bu yüzden sunucu taraflı kredi, satın alma ve hesap silme (K4, Y1, Y2, O4) kurulamaz. Ayrıca çalışmayan bir giriş butonu App Store incelemesinde ret sebebidir (Guideline 2.1).
- **Çözüm:** Supabase Auth ile gerçek giriş: iOS'ta Apple (`signInWithIdToken`), Android'de Google. Hazır değilse Google butonunu kaldır, Android'de Apple butonunu gizle.

### 🟠 Y4 — Hangi modelin ve hangi çözünürlüğün kullanılacağını istemci seçiyor

- **Yer:** `server/cloudflare-worker.js:230-231, 299-301`, `server/express-server.js:134-138, 304`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:** Sunucu, istekteki `model`, `imageSize` ve `maxOutputTokens` değerlerini olduğu gibi kullanıyor.
- **Senaryo:** Saldırgan (veya K4 sayesinde herhangi biri) en pahalı modeli ve 4K çözünürlüğü seçer; her istek senin için çok daha pahalıya gelir.
- **Not (fp-check):** Model adının URL'ye eklenmesiyle anahtarı başka bir sunucuya sızdırmak mümkün değil; adres sabit (`generativelanguage.googleapis.com`). Risk sadece maliyet.
- **Çözüm:** Model adını istemciden almayın. Sunucuda sabit bir izin listesi tutun (`{ standard: '...', '4k': '...' }`); 4K'yı sadece kredisi düşülmüş kullanıcıya verin.

### 🟠 Y5 — Görsel deposu herkese açık, listelenebilir ve herkes her klasöre yükleyebilir

- **Yer:** `supabase/schema.sql:622-636`
- **Durum:** KOŞULLU (şema kuruluysa).
- **Ne oluyor:**
  - Okuma politikası herkese (giriş yapmamışlar dahil) açık. Supabase Storage'ın listeleme özelliğiyle tüm dosya adları, dolayısıyla tüm kullanıcı kimlikleri (klasör adları) ve **gizli** olarak işaretlenmiş pastaların görselleri görülebilir.
  - Yükleme politikası klasör kontrolü yapmıyor: giriş yapmış biri başka kullanıcının klasörüne dosya koyabilir.
  - Dosya türü ve boyut sınırı yok: depo ücretsiz dosya barındırma için kötüye kullanılabilir.
- **Çözüm:**
  ```sql
  -- Yüklemeyi kendi klasörüyle sınırla
  DROP POLICY "Giriş yapmış kullanıcılar pasta görseli yükleyebilir" ON storage.objects;
  CREATE POLICY "Kullanıcı sadece kendi klasörüne yükler" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'cake-images'
                AND (storage.foldername(name))[1] = auth.uid()::text);
  ```
  Bucket'ı gizli (`public = false`) yapıp görselleri imzalı bağlantıyla (`createSignedUrl`) gösterin. Panelden bucket'a 10 MB sınırı ve sadece `image/jpeg`, `image/png`, `image/webp` türlerini tanımlayın.

### 🟡 O1 — Hız sınırı etkisiz veya atlatılabilir

- **Yer:** `server/cloudflare-worker.js:19-21, 173-178`, `server/express-server.js:74-78`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:**
  - Cloudflare: sayaç bellekte (`new Map()`). Cloudflare isteği farklı makinelere dağıtır ve makineler sık yeniden başlar; her biri ayrı sayar. Gerçek sınır 20/dk'dan çok daha yüksek olur.
  - Express: sunucu doğrudan internete açılırsa `X-Forwarded-For` başlığına güveniyor. Her istekte farklı bir değer yazan kişi sınıra hiç takılmaz.
- **Çözüm:** Cloudflare'in yerleşik Rate Limiting bağlamasını veya Durable Object kullanın; anahtar olarak IP değil kullanıcı kimliğini kullanın. Express'te `app.set('trust proxy', ...)` ile sadece bilinen vekil sunucuya güvenin.

### 🟡 O2 — Webhook gizli anahtarı tanımlı değilse herkese açık

- **Yer:** `server/cloudflare-worker.js:137`, `server/express-server.js:378`
- **Durum:** DOĞRULANDI (sharp edge — "güvensiz varsayılan").
- **Ne oluyor:** `if (webhookSecret) { kontrol et }`: anahtar ayarlanmayı unutulursa kontrol tamamen atlanıyor. Şu an webhook kredi eklemediği için etkisi düşük; Y2 düzeltilip webhook kredi eklemeye başladığında herkes kendine kredi yükleyebilir.
- **Çözüm:** Anahtar yoksa 500 dönün (kapalı başarısızlık). Karşılaştırmayı sabit zamanlı yapın (`crypto.subtle.timingSafeEqual` / `crypto.timingSafeEqual`).

### 🟡 O3 — Tarif isteğindeki `details` alanları ve referans görseli denetlenmiyor

- **Yer:** `server/cloudflare-worker.js:229-237, 300`, `server/express-server.js:304-313`
- **Durum:** DOĞRULANDI.
- **Ne oluyor:** `prompt` 500 karakterle sınırlı ve filtreleniyor, ama `details.flavor`, `details.coating`, `details.fillingTags` vb. hiç denetlenmeden yapay zekâya gidiyor. Referans görselin boyutu Cloudflare'de sınırsız.
- **Etkisi:** Çok uzun metinlerle maliyet şişirme; 500 karakter sınırını ve filtreyi `details` üzerinden atlama.
- **Çözüm:** Her alan için tip ve uzunluk kontrolü (ör. her biri en fazla 100 karakter, etiket dizisi en fazla 10 eleman). Görsel için en fazla ~5 MB.

### 🟡 O4 — Hesap silme sessizce başarısız olabilir

- **Yer:** `App.tsx:158-165`, `src/services/accountService.ts:26-53`, `supabase/schema.sql:497-500`
- **Durum:** DOĞRULANDI (birinci kısım), DOĞRULANMALI (ikinci kısım).
- **Ne oluyor:**
  1. Uygulama Supabase'e oturum belirteci yerine **Apple'ın kimlik belirtecini** gönderiyor. Supabase bunu kabul etmez (401). Hata sadece konsola yazılıyor, kullanıcıya "hesabın silindi" deniyor ama sunucudaki veriler duruyor. Bu, Apple Guideline 5.1.1(v) ve KVKK açısından sorun.
  2. Supabase son sürümlerde `storage.objects` tablosundan SQL ile doğrudan silmeyi engelleyebiliyor; bu durumda `delete_user_account` fonksiyonunun tamamı hata verir. Supabase panelinde test edilmeli.
- **Çözüm:** Gerçek Supabase oturumu (Y3) kullanılsın; silme başarısızsa kullanıcıya söylensin. Görselleri SQL yerine sunucudan Storage API ile silin. Satın alma kayıtlarını muhasebe için silmek yerine anonimleştirmeyi düşünün.

### 🟡 O5 — Hoş geldin kredisi çoklu hesapla toplanabilir; iki ayrı bakiye sistemi var

- **Yer:** `supabase/schema.sql:288-331`, `supabase/credits_and_purchases.sql:95-128`
- **Durum:** DOĞRULANDI (kod), KOŞULLU (canlı ayarlar).
- **Ne oluyor:**
  - Her yeni hesaba 50 kredi veriliyor. Supabase'de e-posta ile kayıt açıksa (varsayılan açık) biri yüzlerce sahte hesap açıp her birinden 50 kredi alabilir.
  - İki dosya birlikte kurulursa her yeni kullanıcıya iki tetikleyici çalışır: biri `profiles.credits_balance`'a, diğeri `user_wallets.balance`'a 50 yazar. Hangisinin geçerli olduğu belirsiz; K2/K3 açıkları `profiles` tarafında.
- **Çözüm:** Tek bakiye sistemi seçin (`user_wallets` + `spend_user_credits` + `process_store_purchase` doğru yazılmış olan taraf). Supabase'de sadece Apple/Google girişini açık bırakın, e-posta kaydını ve anonim girişi kapatın. Hoş geldin kredisini düşük tutun veya cihaz başına sınırlayın (App Attest / Play Integrity).

### 🟡 O6 — Kullanıcı kendi pastasının beğeni sayısını değiştirebilir

- **Yer:** `supabase/schema.sql:562-564`
- **Durum:** KOŞULLU (topluluk vitrini açılırsa).
- **Ne oluyor:** Pasta güncelleme politikası sütun kısıtlaması yapmıyor; `likes_count = 1000000` yazılabilir.
- **Çözüm:** K2'deki gibi sütun bazlı UPDATE yetkisi (`title`, `is_favorite`, `is_public`, `recipe`, `details`).

### 🟢 Düşük önemli bulgular

| No | Bulgu | Yer | Çözüm |
|---|---|---|---|
| D1 | `SECURITY DEFINER` fonksiyonlarında `search_path` sabitlenmemiş (Supabase güvenlik denetleyicisinin uyarısı) | `schema.sql:279, 326, 400, 478, 515`; `credits_and_purchases.sql:122, 241, 330, 373` | Her birine `SET search_path = ''` ekleyip tablo adlarını `public.` ile yazın |
| D2 | CORS her siteye açık (`*`) | worker, `express-server.js:13` | Mobil uygulama CORS'a ihtiyaç duymaz; sadece kendi web alan adınıza izin verin |
| D3 | Hata mesajlarında iç ayrıntılar (`err.message`, Google'ın hata metni) istemciye gidiyor | worker `:270, 427, 493`; express `:249, 287, 366` | Kullanıcıya genel mesaj, ayrıntıyı sunucu günlüğüne |
| D4 | API anahtarı adres satırında (`?key=`) gönderiliyor; günlüklere düşebilir | worker `:255, 337, 348`; express `:172, 183, 332` | `x-goog-api-key` başlığını kullanın |
| D5 | Oturum bilgisi (Apple kimlik belirteci dahil) AsyncStorage'da düz metin | `App.tsx:31, 140` | `expo-secure-store` kullanın |
| D6 | Geri bildirim tablosuna giriş yapmadan sınırsız kayıt eklenebilir | `schema.sql:615-617` | `TO authenticated` ekleyin, sunucu üzerinden alın |
| D7 | Sentry tüm oturumların %100'ünü izliyor (`tracesSampleRate: 1.0`) | `monitoringService.ts:25` | Yayında 0.1-0.2 yeterli; hem maliyet hem gizlilik |
| D8 | Prompt injection: kullanıcı notu doğrudan istemle birleşiyor; anahtar kelime filtresi kolayca atlanır | `geminiRecipeService.ts:29, 43`; worker `:74-114` | Etkisi düşük (model araç kullanmıyor, çıktıyı sadece aynı kullanıcı görüyor). Kuralları `systemInstruction`'a taşıyın, kullanıcı metnini etiketle sarın |
| D9 | 24 npm uyarısı (1 kritik: `shell-quote`) | dolaylı bağımlılıklar | Ayrıntı 5. bölümde |

---

## 5. Bağımlılık (tedarik zinciri) taraması

`supply-chain-risk-auditor` betiği 23 Ekim 2026'da çalıştırıldı.

- **29 doğrudan bağımlılığın hiçbirinde bilinen açık yok** (kullanılan sürümlerde). Hiçbiri terk edilmiş, arşivlenmiş veya kurulumda betik çalıştıran paket değil.
- **519 dolaylı paketten 7'sinde bilinen açık var:**

| Paket | Sürüm | Açık | Nereden geliyor |
|---|---|---|---|
| `shell-quote` | 1.10.0 | Komut enjeksiyonu (GHSA-pqg4-j6r4-53mv) — npm "kritik" | Expo/React Native geliştirme sunucusu |
| `node-forge` | 1.4.0 | İmza doğrulama hatası (GHSA-86w9-cpqp-85rv) | `@expo/code-signing-certificates` |
| `source-map-js` | 1.2.1 | Hizmet engelleme (GHSA-68fv-2mgg-jv7q) | Metro paketleyici |
| `braces`, `brace-expansion` | 3.0.3 / 5.0.9 | Hizmet engelleme | Metro dosya izleyici |
| `compression` | 1.8.1 | Hizmet engelleme (GHSA-vc2v-76pw-4v95) | Expo geliştirme sunucusu |
| `uuid` | 7.0.3 | Sınır kontrolü eksik (GHSA-w5hq-g745-h8pq) | `xcode` → `@expo/config-plugins` |

- **Değerlendirme:** Bu paketlerin hepsi geliştirme ve derleme araçlarında (Expo CLI, Metro). Telefona giden uygulama paketine girmiyorlar, kullanıcılar etkilenmiyor. Risk sadece geliştirici bilgisayarında ve derleme ortamında.
- **Yapılacak:** `npm audit fix` (`--force` **olmadan**) uyumlu sürümlere yükseltir. npm'in önerdiği `--force` çözümü Expo'yu SDK 44'e düşürür; kesinlikle uygulamayın (proje SDK 57'ye sabit). Yükseltmeden sonra uygulamayı ve testleri çalıştırın.
- **Bilgi:** 19 Expo paketinin kaynak deposunda derlenmiş ikili dosya var (OpenSSF Scorecard). Bu, Expo'nun kendi depo düzeniyle ilgili; senin yapacağın bir şey yok.

---

## 6. İncelenen ama yanlış alarm çıkanlar (fp-check)

Bu maddeler ilk bakışta açık gibi göründü, kaynaktan izlenince istismar edilemediği görüldü:

| Şüphe | Neden açık değil |
|---|---|
| Tarif metni üzerinden XSS / zararlı bağlantı | `DiyRecipeCard` kendi basit biçimlendiricisini kullanıyor; bağlantı, HTML veya görsel desteklemiyor |
| Cloudflare'de IP başlığını taklit ederek hız sınırını atlatma | Cloudflare `cf-connecting-ip` başlığını her zaman kendisi yazar, taklit edilemez (Express için geçerli, bkz. O1) |
| Model adıyla adresi değiştirip anahtarı başka sunucuya sızdırma | Alan adı sabit; sadece Google'ın kendi adresleri arasında kalınıyor (maliyet riski Y4'te) |
| `spend_user_credits` ile negatif harcama | `p_cost <= 0` kontrolü var |
| İstemciden `add_user_credits` / `process_store_purchase` çağırarak kredi yükleme | Çalıştırma yetkisi kaldırılmış (`REVOKE`) ve rol kontrolü var |
| `.env` dosyasının GitHub'a gitmesi | `.gitignore`'da; git geçmişinde hiç yok |
| Yayın sürümünde ücretsiz "sandbox" satın alma | `!__DEV__` kontrolüyle yayın sürümünde kapalı (`iapService.ts:148`) |
| Doğrudan bağımlılıklarda bilinen açık | 29 paketin hiçbirinde yok |

---

## 7. Yayın öncesi yapılacaklar listesi

### Aşama 1 — Yayını engelleyenler (sırayla)

- [ ] **K1** Cloudflare sunucusunu yayınla, Gemini anahtarını sunucuya koy, `.env`'den `EXPO_PUBLIC_GEMINI_API_KEY`'i sil, eski anahtarı iptal et
- [ ] **K1** Yayın sürümünde doğrudan Gemini modunu kodda kapat
- [ ] **K1** Google Cloud'da anahtara harcama/kota sınırı koy
- [ ] **Y3** Supabase Auth ile gerçek giriş (iOS: Apple, Android: Google); sahte Google butonunu kaldır
- [x] **K2** `profiles` UPDATE yetkisini güvenli sütunlarla sınırla *(kodda yapıldı — Supabase'de yamayı çalıştır)*
- [x] **K3** `deduct_user_credits`'e tutar kontrolü ekle *(kodda yapıldı — Supabase'de yamayı çalıştır)*
- [ ] **O5** Tek bakiye sistemine geç (`user_wallets`), e-posta ve anonim kaydı kapat
- [ ] **K4** Sunucuda oturum doğrulama + üretimden önce sunucu taraflı kredi düşme + başarısızlıkta iade
- [ ] **Y1** Uygulama bakiyeyi sunucudan okusun, kendi tutmasın
- [ ] **Y2** RevenueCat webhook'u ile sunucuda kredi yükleme ve iade
- [ ] **O2** Webhook gizli anahtarını zorunlu yap
- [ ] **Y4** Sunucuda model izin listesi

### Aşama 2 — İlk güncellemeye kadar

- [ ] **Y5** Storage politikaları, gizli bucket, boyut/tür sınırı
- [ ] **O1** Kullanıcı bazlı, kalıcı hız sınırı
- [ ] **O3** `details` ve görsel boyutu doğrulaması
- [ ] **O4** Hesap silmeyi doğru oturumla çalıştır, hatayı kullanıcıya göster; Supabase'de test et
- [ ] **O6** `cakes` sütun bazlı UPDATE yetkisi

### Aşama 3 — Sağlamlaştırma

- [ ] D1-D9 (yukarıdaki tablo)
- [ ] `npm audit fix` (force olmadan) + test
- [ ] semgrep kurup otomatik tarama: `semgrep --config p/javascript --config p/typescript --config p/react src server`
- [ ] Yayından önce bu denetimi tekrar çalıştır

---

## 8. Supabase panelinde kontrol edilecekler

Canlı veritabanına bağlanılmadığı için şunlar elle doğrulanmalı:

1. **Hangi şema kurulu?** Table Editor'da `profiles`, `user_wallets`, `credit_transactions`, `credit_ledger` tablolarından hangileri var? İkisi birden varsa O5 geçerli.
2. **RLS açık mı?** Her tabloda "RLS enabled" yazmalı.
3. **Security Advisor** (Database → Advisors): `function_search_path_mutable` ve "policy" uyarılarını listeleyin.
4. **Authentication → Providers:** Email sağlayıcısı ve "Allow anonymous sign-ins" kapalı olmalı (uygulama sadece Apple/Google kullanıyorsa).
5. **Storage → cake-images:** Bucket herkese açık mı? Dosya boyutu ve tür sınırı var mı?
6. **`delete_user_account`'ı test hesabıyla çalıştırın:** Hata veriyorsa O4'ün ikinci kısmı geçerli.

---

## 9. Hedef mimari (kısa)

```
Uygulama ──(Supabase oturumu)──▶ Cloudflare sunucusu ──▶ Gemini
   │                                │
   │                                ├─ oturumu doğrular
   │                                ├─ krediyi user_wallets'tan düşer (service_role)
   │                                ├─ modeli kendi seçer, isteği sınırlar
   │                                └─ hata olursa krediyi iade eder
   │
   └─(satın alma)─▶ Apple/Google ─▶ RevenueCat ─(webhook + gizli anahtar)─▶ sunucu ─▶ user_wallets
```

Uygulamanın içinde gizli hiçbir şey kalmaz; telefonda tutulan bakiye sadece gösterim içindir. Sunucu her kararı kendisi verir.
