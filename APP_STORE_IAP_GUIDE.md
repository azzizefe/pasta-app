# Lumière Sucrée — Apple App Store Connect & IAP İnceleme Rehberi

Bu rehber, **Lumière Sucrée** uygulamasının Apple App Store incelemesinden (App Review) ve **In-App Purchase (IAP - Kılavuz 3.1.1 & 4.8)** onayından tek seferde geçebilmesi için gereken tüm teknik gereksinimleri, ekran görüntülerini ve inceleme notlarını içerir.

---

## 1. App Store Connect In-App Purchase (IAP) Yapılandırması

Apple App Store Connect panelinde (**Monetization -> In-App Purchases**) tanımlanması gereken 3 tüketilebilir (Consumable) kredi paketi:

| Ürün Adı | Product ID | Tip | Fiyat Kademesi (Tier) | Açıklama |
| :--- | :--- | :--- | :--- | :--- |
| **15 Lumière Kredisi** | `lumiere_credits_single_15` | Consumable | $2.49 / ₺87,99 | 1 adet yüksek çözünürlüklü yapay zeka pasta tasarımı üretimi sağlar. |
| **200 Lumière Kredisi** | `lumiere_credits_starter_200` | Consumable | $24.99 / ₺874,99 | 13 adet yüksek çözünürlüklü yapay zeka pasta tasarımı üretimi sağlar. |
| **1.000 Lumière Kredisi** | `lumiere_credits_popular_1000` | Consumable | $99.99 / ₺3.499,99 | 66 adet yüksek çözünürlüklü yapay zeka pasta tasarımı üretimi sağlar. |

---

## 2. Apple İnceleme Ekibi İçin IAP İnceleme Ekran Görüntüsü (Review Screenshot)

> [!IMPORTANT]
> Apple, her bir IAP ürünü için uygulamanın içindeki satın alma ekranını gösteren en az bir adet **Review Screenshot (640x920 px veya daha büyük)** yüklenmesini zorunlu kılar. Bu görsel olmadan IAP durumunuz *"Missing Metadata"* olarak kalır ve incelemeye gönderilemez.

### Satın Alma Ekranı Görseli Gereksinimleri:
- **Konum:** [CreditsScreen.tsx](file:///c:/Users/efe/Desktop/pasta-app/src/screens/CreditsScreen.tsx) ekranının tam ekran görüntüsü.
- **Görülmesi Gereken Zorunlu Öğeler:**
  1. Paket fiyatları ve kredi miktarları net olarak okunabilir olmalıdır.
  2. Sayfanın altında **"Satın Alımları Geri Yükle (Restore Purchases)"** butonu yer almalıdır.
  3. Apple EULA **"Kullanım Koşulları (Terms of Use)"** ve **"Gizlilik Politikası (Privacy Policy)"** tıklanabilir bağlantıları bulunmalıdır.
  4. Apple Guideline 3.1.1'e uygun tüketim kuralları metni (*"Krediler tüketilebilir dijital içeriktir..."*) görünmelidir.

---

## 3. Apple İnceleme Notları (App Review Information)

App Store Connect'te **App Review Information -> Notes** bölümüne girilecek resmi açıklama metni:

```text
Dear Apple Review Team,

Thank you for reviewing Lumière Sucrée.

1. In-App Purchases:
Our app offers 3 consumable credit packages (200, 1000, and 3000 Credits) used exclusively within the app to generate bespoke, high-resolution AI wedding and celebration cake designs using Google Gemini multimodal vision.
- Each generation consumes 5 credits.
- Users can view and purchase packages via the gold credit badge in the top right header on any screen.
- A "Restore Purchases" button and direct links to our Terms of Use (EULA) and Privacy Policy are provided on the purchase sheet in accordance with Guideline 3.1.1.

2. Sign in with Apple (Guideline 4.8):
We support native "Sign in with Apple" on the welcome screen. Reviewers can tap "Sign in with Apple" to test the onboarding flow with their Apple Sandbox account.

3. Demo Account / Credentials:
If needed, demo access is available by selecting any sign-in option. Test sandbox IAP transactions can be performed using an Apple Sandbox Tester account.

Best regards,
Lumière Sucrée Engineering Team
```

---

## 4. App Store Connect Ekran Görüntüleri (Screenshots) Boyut Rehberi

Apple App Store yayını için hazırlanması gereken cihaz ekran boyutları:

| Cihaz Tipi | Çözünürlük | Zorunluluk |
| :--- | :--- | :--- |
| **iPhone 6.7" Display** (iPhone 15 Pro Max, 16 Pro Max, 14 Pro Max) | **1290 x 2796 px** (veya 1284 x 2778 px) | **Zorunlu** |
| **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max) | **1242 x 2688 px** | İsteğe Bağlı |
| **iPhone 5.5" Display** (iPhone 8 Plus) | **1242 x 2208 px** | İsteğe Bağlı |
| **iPad Pro 12.9" Display** (6. Nesil) | **2048 x 2732 px** | Sadece iPad desteği açıksa |

### Hazırlanacak 5 Temel Mağaza Ekranı:
1. **Ekran 1 (Giriş / Karşılama):** *"Hayalinizdeki Pastayı Yapay Zeka ile Tasarlayın"* (LoginScreen + Lüks pasta görseli + Sign in with Apple).
2. **Ekran 2 (Ana Sayfa & Akış):** *"5 Farklı Kategori & Fransız Patisserie Zarafeti"* (Düğün, Doğum Günü, Nişan kartları).
3. **Ekran 3 (İlham Fotoğrafı / Multimodal):** *"Gelinlikten veya Çiçekten İlham Alın"* (ReferenceImagePicker ile gelinlik kumaşı yükleme).
4. **Ekran 4 (Sonuç & Brifing):** *"Pastacı Sipariş Kartı ve 8K Görsel İndirme"* (Üretilen pasta + İndir & Paylaş butonları).
5. **Ekran 5 (Özel Gün Takvimi):** *"Sevdiklerinizin Doğum Gününü Asla Unutmayın"* (14 gün önceden bildirim takvimi).

---

## 5. EAS Build Canlı Dağıtım Komutları

```bash
# 1. EAS CLI ile giriş yapın
npx eas login

# 2. Projeyi yapılandırın
npx eas project:init

# 3. iOS TestFlight derlemesi başlatın
npx eas build --platform ios --profile production --auto-submit

# 4. Android Google Play AAB derlemesi başlatın
npx eas build --platform android --profile production --auto-submit
```
