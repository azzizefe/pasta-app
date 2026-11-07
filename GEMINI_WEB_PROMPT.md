# 🏛️ MASTER AI PROMPT: "Lumière Sucrée" — Ultra-Lüks 3D Web Sitesi & Hukuk Merkezi (Three.js & Vanilla/Modern Web)

> **Bu dosyayı doğrudan Gemini 4 Argon / Claude 3.7 / GPT-4o gibi gelişmiş yapay zeka modellerine kopyala-yapıştır yaparak eksiksiz, tek sayfa (SPA) veya modüler bir lüks web sitesi ürettirebilirsin.**

---

```markdown
# 👑 SYSTEM & ROLE PROMPT: Haute Couture Web Architect & Creative Developer

Sen dünyanın en prestijli Fransız lüks markalarına (Chanel, Dior, Ladurée, Cedric Grolet) dijital deneyimler tasarlayan kıdemli bir **Creative Frontend Developer** ve **Three.js / WebGL Uzmanısın**.

Görevin, yapay zeka destekli haute pâtisserie (özel tasarım lüks pasta) mobil uygulaması olan **"Lumière Sucrée"** için nefes kesici, 60 FPS akıcılığında, interaktif 3D ögeler barındıran ve Apple App Store onay gereksinimlerine (Gizlilik Politikası, Kullanım Şartları, Hesap Silme) %100 uyumlu bir **Resmi Web Sitesi & Tanıtım Vitrini** geliştirmektir.

---

## 🎨 1. MARKA KİMLİĞİ VE TASARIM SİSTEMİ (DESIGN TOKENS)

Sitedeki tüm renkler, tipografi ve atmosfer Fransız Barok pastacılığı ve modern Parizyen lüksünü yansıtmalıdır:

* **Renk Paleti (CSS Variables):**
  * `--bg-cream`: `#FAF6F0` (Sıcak fildişi zemin)
  * `--bg-card`: `#FFFFFF` (Pürüzsüz porselen beyazı)
  * `--text-ink`: `#2A2523` (Derin espresso/çikolata tonu)
  * `--text-muted`: `#7A726D` (Kadife kül grisi)
  * `--accent-gold`: `#C5A059` (24K yenilebilir altın varak tonu)
  * `--accent-gold-light`: `#F7E9CE` (Şampanya ışıltısı)
  * `--accent-dark`: `#3B2416` (Kavrulmuş kakao / lüks deri)
  * `--border-glass`: `rgba(232, 226, 217, 0.7)` (Yarı saydam cam bordür)
  * `--glass-bg`: `rgba(255, 253, 249, 0.82)` (Glassmorphism kart zemini)
* **Tipografi:**
  * **Başlıklar (Headings):** `'Playfair Display', serif` veya `'Cormorant Garamond', serif` (Zarif, editorial, lüks dergi stili)
  * **Gövde Metinleri (Body):** `'Outfit', 'Inter', -apple-system, sans-serif` (Okunaklı, ferah, modern)
* **Efektler:**
  * İpeksi altın parıltıları (Golden shimmer sweep), yumuşak zemin gölgeleri (`box-shadow: 0 10px 40px rgba(59, 36, 22, 0.06)`), pürüzsüz hover mikro-etkileşimleri.

---

## 🛠️ 2. TEKNOLOJİ YIĞINI & KÜTÜPHANELER (CDN ÜZERİNDEN HAZIR)

Aşağıdaki kütüphaneleri harici karmaşık paket kurulumuna gerek kalmadan doğrudan CDN ile kullan:
1. **Three.js (r128+):** `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` (İnteraktif 3D pasta modeli, partiküller ve altın tozu efektleri)
2. **GSAP (GreenSock) & ScrollTrigger:** `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js` (Ekran kaydırma ve buton mikro-animasyonları)
3. **Lenis Smooth Scroll:** `https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.19/bundled/lenis.min.js` (Ultra yumuşak kaydırma hissi)
4. **Google Fonts:** `Playfair Display:wght@500;700` & `Outfit:wght@300;400;600`

---

## 🍰 3. EKRAN BÖLÜMLERİ VE ÖZELLİK LİSTESİ

Web sitesi aşağıdaki bölümleri kusursuz bir hiyerarşiyle içermelidir:

### 1. Header & Navigation (Cam Efektli Sabit Menü)
* **Logo:** Sol tarafta altın monogram logo (`Lumière Sucrée` - Paris).
* **Menü Bağlantıları:**
  * *Deneyim (3D Studio)*
  * *Özellikler (Features)*
  * *Koleksiyon (Gallery)*
  * *Gizlilik & Şartlar (Legal)*
* **Eylem Butonu (CTA):** Şık parlayan altın çerçeveli *"Uygulamayı İndir (App Store & Google Play)"* butonu.

### 2. Hero Section (3D Etkileşimli Giriş Sahnesi)
* **Sol Taraf (Typography & CTA):**
  * Rozet: `✨ HAUTE PÂTISSERIE ARTIFICIELLE`
  * Başlık: *"Hayalinizdeki Pastayı Yapay Zeka ile Tasarlayın"*
  * Alt Metin: *"Fransız pastacılık ekolünün zarafeti, Gemini Vision yapay zekasıyla buluşuyor. Düğün, nişan ve özel kutlamalarınız için kusursuz pasta konseptleri, teknik pastacı fişi ve canlı porsiyon simülatörü."*
  * İndirme Rozetleri: Resmi Apple App Store ve Google Play butonları.
  * Güvenilirlik Notu: *"Apple Guideline 5.1.1 Uyumlu · Yüksek Çözünürlüklü 4K Render · Sıfır Risk Garantisi"*
* **Sağ Taraf (Three.js 3D Sahnesi):**
  * Canvas üzerinde fare hareketiyle dönen 3 katlı lüks silindirik pasta.
  * Pastanın katları arasında altın varaklar (`MeshPhysicalMaterial` - Metalness & Roughness).
  * Çevresinde yavaşça süzülen ışıltılı altın toz partikülleri (`THREE.Points`).
  * Kullanıcı pastayı fareyle veya parmağıyla 360° döndürebilmeli (Orbit / Damping).

### 3. İnteraktif "Mini Stüdyo" Simülatörü (Interactive Preview Widget)
* Kullanıcı web sitesi üzerindeyken butona tıklayarak pastanın stilini değiştirebilir:
  * **Kat Sayısı:** 1 Katlı (Modern Butik) / 2 Katlı (Nişan) / 3 Katlı (Versailles Düğün)
  * **Renk / Kaplama:** Fildişi Kadife / Şampanya Altını / Gece Mavisi Barok
  * **Tıklama Anında:** Three.js 3D modeli yumuşak bir animasyonla renk ve ölçek değiştirir!

### 4. Öne Çıkan Özellikler (Grid Showcase)
* **1. Gemini Vision AI Motoru:** İlham aldığınız bir çiçeği veya mekanı yükleyin, yapay zeka fotoğrafik pastaya dönüştürsün.
* **2. Butik Pastacı Sipariş Fişi (Baker's Spec):** Kat çapları, porsiyon sayısı, renk Pantone/HEX kodları ve lezzet katmanlarını içeren indirilebilir teknik brifing.
* **3. Canlı Porsiyon & Maliyet Tezgâhı:** Kaç kişilik davet olduğunu girin, pastanın kat çaplarını ve malzeme gramajını anında hesaplasın.
* **4. Özel Gün Takvimi:** Düğün ve kutlamalarınızdan önce sizi uyaran akıllı zamanlayıcı.

### 5. Lüks Galeri (Curated Collection)
* 3D kartlar halinde sergilenen gerçekçi tasarımlar:
  * *Château de Versailles (Fildişi fondan & altın varak)*
  * *Velours Rose & Ruban (Kadife pembe & saten fiyonk)*
  * *L'Étoile Noire (Siyah inci & trüf çikolata)*

### 6. Hukuk & Güvenlik Merkezi (Legal & Compliance Section)
> **ÇOK ÖNEMLİ:** Apple App Store ve Google Play incelemelerinden geçmek için sitenin en altında veya modal/sekme olarak aşağıdaki sayfalar eksiksiz yer almalıdır:

1. **Gizlilik Politikası (Privacy Policy):**
   * Veri Sorumlusu: Lumière Sucrée Inc.
   * Toplanan Veriler: Fotoğraf yüklemeleri (yalnızca pasta üretimi için geçici işlenir), anonim analitikler, oturum bilgisi.
   * Üçüncü Taraflar: Google Cloud Vertex AI (Gemini), Apple Sign-In, Supabase. Veriler asla 3. şahıslara satılmaz.
   * GDPR / KVKK Hakları ve İletişim: `privacy@lumieresucree.app`.
2. **Kullanım Koşulları (Terms of Use / EULA):**
   * Standart Apple EULA ve uygulama içi kredi (In-App Purchase) kullanım şartları.
   * Yapay zeka ile üretilen görsellerin fikri mülkiyet ve ticari kullanım hakları.
3. **Apple Guideline 5.1.1(v) — Hesap ve Veri Silme Talebi (Account Deletion Request):**
   * Apple'ın zorunlu kıldığı web üzerinden hesap silme form alanı:
   * Kullanıcı e-postasını veya Apple ID Kimlik kodunu yazıp *"Tüm Verilerimi ve Hesabımı Kalıcı Olarak Sil"* butonuna basabilir.

### 7. Footer (Zarif Alt Bilgi)
* © 2026 Lumière Sucrée. Paris & Global. All rights reserved.
* Dil seçici: English / Türkçe / Français.
* Destek: `contact@lumieresucree.app`.

---

## 💻 4. KOD YAPISI VE UYGULAMA KURALLARI

1. **Tek Dosya (SPA) veya Temiz Modüler Yapı:**
   * İster tek bir `index.html` içinde `<style>` ve `<script>` ile çalışsın, ister Vite/HTML modülleri olarak; **harici bir derleme hatası vermeden doğrudan tarayıcıda çift tıklanarak çalışabilecek** şekilde yaz.
2. **Mobil Uyumluluk (Fully Responsive):**
   * iPhone 15/16 Pro, iPad ve 4K masaüstü ekranlarda kusursuz ölçeklensin (`viewport-fit=cover`).
   * Mobilde 3D Canvas dokunmatik hareketi (touch drag) pürüzsüz çalışsın, sayfa kaydırmasını kilitlemesin.
3. **SEO ve Sosyal Medya Meta Etiketleri:**
   * `<title>Lumière Sucrée — Haute Couture AI Cake Atelier</title>`
   * OpenGraph (og:title, og:image, og:description) ve Twitter Card meta tag'leri eksiksiz olsun.
4. **Hafif ve Performanslı:**
   * Three.js sahnesinde gereksiz poligon kullanma. Pastayı procedural silindir ve torus geometrileriyle, altın shader malzemeleriyle hafif ve 60 FPS oluştur.

Lütfen şimdi bu web sitesinin **tüm HTML, Three.js 3D animasyon scriptleri, CSS stilleri ve Gizlilik Politikası / Şartlar metinlerini içeren eksiksiz ve çalışan kodunu** üret!
```

---

## 🚀 Bu Prompt Nasıl Kullanılır?

1. Yukarıdaki kod bloğunun içeriğini kopyala.
2. **Gemini 4 Argon**, Claude 3.7 Sonnet veya GPT-4o'ya yapıştır.
3. Model sana tek bir `index.html` dosyası veya `index.html`, `style.css`, `main.js` olarak web sitesini üretecektir.
4. Çıkan dosyayı projedeki `legal/` klasörüne veya Vercel / Cloudflare Pages / GitHub Pages gibi ücretsiz bir hostinge yüklediğinde **Apple App Store başvurundaki "Marketing URL", "Support URL" ve "Privacy Policy URL" alanlarına doğrudan bu adresi yazabilirsin!**
