# Lumière Sucrée web sitesi — yapay zekâ promptu

Aşağıdaki metnin tamamını bir yapay zekâ site oluşturucusuna (Claude, v0, Lovable, Bolt vb.) yapıştır.
Köşeli parantezli `[...]` alanları göndermeden önce kendi bilgilerinle doldur.

---

## PROMPT

Lumière Sucrée adlı iOS uygulaması için küçük, statik, çok hızlı bir web sitesi yap. Site App Store
incelemesinden geçmek için gereken yasal sayfaları barındıracak; uygulama bu adreslere doğrudan link veriyor.

### Uygulama hakkında
- **Ad:** Lumière Sucrée
- **Ne yapar:** Kullanıcı hayalindeki pastayı anlatır (tür, kişi sayısı, tema, renk, lezzet, isteğe bağlı ilham fotoğrafı). Yapay zekâ pastanın fotoğraf kalitesinde bir görselini ve ev yapımı tarifini üretir. Kullanıcı tasarımı pastaneye gösterebileceği bir sipariş fişi olarak paylaşabilir. Sevdiklerinin özel günleri için hatırlatıcı da kurabilir.
- **Gelir modeli:** Uygulama içi satın alınan tüketilebilir krediler. Bir tasarım 15 kredi tutar ve yeni hesaplar 15 kredi hoş geldin hediyesi alır (bir ücretsiz tasarım). Abonelik yok, reklam yok.
- **Platform:** iPhone (iOS). İleride Android de gelebilir.
- **Diller:** Uygulama 16 dilde; dil cihazın ülkesine göre otomatik seçiliyor.
- **Geliştirici:** [YASAL AD / ŞİRKET ADI], [ADRES], [ÜLKE]
- **İletişim:** support@lumieresucree.app
- **Alan adı:** https://lumieresucree.app

### Sayfalar ve adresler (adresler kesin, uygulama bunlara link veriyor)
| Adres | İçerik |
|---|---|
| `/` | Tanıtım sayfası |
| `/privacy` | Gizlilik Politikası |
| `/terms` | Kullanım Koşulları (EULA) |
| `/support` | Destek ve SSS |
| `/delete-account` | Hesap ve veri silme talimatı |

- Her sayfa bir klasör içinde `index.html` olsun (`/privacy/index.html` gibi). Böylece adresler her statik barındırmada `.html` uzantısız çalışır.
- Ayrıca bir `404.html` ekle.

### Dil
- Ana dil İngilizce.
- Her sayfanın Türkçe kopyası `/tr/...` altında olsun (`/tr/privacy` gibi).
- Üst menüde basit bir EN | TR geçişi olsun.
- Yasal metinlerde şu cümle yer alsın: "İngilizce sürüm ile çeviri arasında fark olursa İngilizce sürüm geçerlidir."

### Teknik kurallar
- Sadece HTML ve CSS kullan; çerçeve ve derleme adımı olmasın. JavaScript yalnızca gerekirse ve minimum düzeyde olsun.
- Çerez, analitik, takip kodu ve harici yazı tipi sunucusu kullanma. Yazı tiplerini dosya olarak ekle ya da sistem yazı tiplerini kullan. Böylece çerez onay bandına gerek kalmaz.
- Önce mobil düşün: 360 px genişlikte yatay kaydırma olmasın, okunabilir satır uzunluğu olsun (en fazla ~70 karakter).
- Erişilebilirlik:
  - anlamsal başlıklar ve `lang` özniteliği;
  - yeterli renk kontrastı;
  - klavyeyle gezinme ve görünür odak.
- Her sayfada `<title>`, `meta description` ve Open Graph etiketleri olsun.
- Cloudflare Pages, Netlify veya GitHub Pages'e olduğu gibi yüklenebilsin. Kısa bir `README.md` ile nasıl yayınlanacağını yaz.

### Görsel kimlik (uygulamayla aynı)
- **Hava:** Paris pastanesi, sıcak, sade, lüks. Bol boşluk, ince çizgiler, abartısız.
- **Renkler:**
  - arka plan krem `#FDFAF3` / `#FBF2E9`;
  - pudra pembe `#F2C9C2` / `#F8DCD6`;
  - gül kurusu `#C08880`;
  - koyu kahve metin `#2A1A15`;
  - ikincil metin `#6B4F47`;
  - altın vurgu `#8A5A1C`;
  - kart `#FBF6EA`, kart çerçevesi `#EFE5D3`.
- **Yazı tipi:** başlıklar zarif bir serif (Playfair Display tarzı), gövde temiz bir sans-serif.
- **Logo:** Şimdilik "Lumière Sucrée" yazısı serif ile yazılsın. `[LOGO]` ve `[UYGULAMA EKRAN GÖRÜNTÜLERİ]` için yer tutucu bırak.

### Tanıtım sayfası (`/`)
- **Başlık:** "Design your dream cake with AI"
- **Kısa açıklama:** Üç özellik kartı:
  - Yapay zekâ ile pasta tasarla;
  - Ev yapımı tarif ve pastane sipariş fişi;
  - Özel gün hatırlatıcıları.
- "Download on the App Store" rozeti için yer tutucu: `[APP STORE LİNKİ]`.
- **Alt bilgi:** Privacy · Terms · Support · Delete account · © [YIL] [YASAL AD]

### Gizlilik Politikası (`/privacy`) — içerik gerçeğe birebir uymalı
Başta "Yürürlük tarihi: [TARİH]" ve kısa, sade bir özet kutusu olsun:
- verini satmıyoruz;
- reklam yok;
- seni uygulamalar arasında takip etmiyoruz.

Sonra şu bölümler gelsin:

1. **Kim sorumlu (veri sorumlusu):** [YASAL AD], [ADRES], support@lumieresucree.app

2. **Hangi verileri topluyoruz ve neden** (her madde için: veri → amaç → hukuki dayanak):
   - **Hesap:** Apple veya Google ile girişte adın, e-posta adresin (Apple'ın "e-postamı gizle" adresi olabilir) ve hesap kimliğin. Amaç hesabı oluşturmak ve kredileri hesaba bağlamak. Dayanak: sözleşmenin ifası. Şifrene hiçbir zaman erişmiyoruz.
   - **Pasta açıklaması ve ilham fotoğrafı:**
     - Kapsam: yazdığın açıklama, seçtiğin detaylar, düzenleme notların ve eklersen ilham fotoğrafın.
     - Ne zaman gönderilir: yalnızca uygulamada açıkça izin verdiğinde.
     - Nereye: şifreli bağlantıyla, sunucumuz üzerinden Google Gemini API'ye. Google yanıt vermezse yedek olarak OpenAI API'ye.
     - Gönderilmeyenler: adın, e-postan ve hesap bilgilerin.
     - Amaç: görseli ve tarifi üretmek. Dayanak: açık rıza.
     - İzni geri alma: Profil → Gizlilik Merkezi'nden istediğin zaman.
     - Model eğitimi: sağlayıcıların API koşullarına göre içerik modellerini eğitmek için kullanılmaz. Sağlayıcılar kötüye kullanımı önlemek için içeriği sınırlı bir süre saklayabilir.
   - **Satın almalar:**
     - Ödemeyi Apple (ileride Google) işler. Kart numaranı ve fatura bilgilerini hiçbir zaman görmüyor ve saklamıyoruz.
     - Satın almayı doğrulamak ve krediyi hesabına eklemek için RevenueCat hizmetini kullanıyoruz. RevenueCat satın alma kaydını ve hesap kimliğini alır.
     - Satın alma kaydını (ürün, işlem kimliği, kredi miktarı) sunucumuzda tutuyoruz.
     - Dayanak: sözleşmenin ifası ve yasal yükümlülük (muhasebe).
   - **Cihazında kalanlar:**
     - Kaydettiğin tasarımlar, kredi bakiyen, profil fotoğrafın ve özel gün hatırlatıcıların cihazında saklanır.
     - Hatırlatma bildirimleri cihazında yerel olarak planlanır.
     - Uygulamayı silince bu veriler de silinir.
   - **Hata ve performans raporları:**
     - Uygulamanın kararlı çalışması için Sentry hizmetiyle çökme raporları ve performans verisi toplanır: cihaz modeli, işletim sistemi ve uygulama sürümü, hata ayrıntıları, oturum bilgisi ve hesap kimliğin (e-postan ve adın gönderilmez).
     - Uygulama ayrıca anonim kullanım sayaçları tutar (ilk kurulum tarihi, oturum sayısı) ve geri dönüş istatistiğini bu raporlara ekler.
     - Dayanak: meşru menfaat (hizmetin güvenliği ve kararlılığı).
   - **Destek yazışmaları:** Bize e-posta gönderdiğinde e-posta adresin, mesajın ve uygulamanın otomatik eklediği sürüm bilgisi. Amaç sorunu çözmek.
   - **Kamera ve fotoğraflar:** Yalnızca sen bir fotoğraf seçtiğinde ya da çektiğinde erişilir. Profil fotoğrafı cihazda kalır; ilham fotoğrafı yukarıdaki gibi yapay zekâya gönderilir.

3. **Yapmadıklarımız:** Reklam yok. Veri satışı, kiralaması veya takası yok. Uygulamalar ve web siteleri arasında takip yok (App Tracking Transparency kapsamında takip yapılmıyor). Otomatik karar ile seni etkileyen profilleme yok.

4. **Hizmet sağlayıcılar (alt işleyenler)** — tablo halinde (sağlayıcı / amaç / konum):
   - Google (Gemini API) — görsel ve tarif üretimi — ABD;
   - OpenAI — yedek görsel üretimi — ABD;
   - RevenueCat — satın alma doğrulama — ABD;
   - Sentry — hata raporları — [ABD/AB];
   - Apple / Google — giriş ve ödeme;
   - [BARINDIRMA SAĞLAYICISI] — sunucu ve veritabanımız — [ÜLKE].

5. **Yurt dışına aktarım:** Veriler bazı sağlayıcılar aracılığıyla ABD'ye aktarılabilir. Uygun güvenceler (Standart Sözleşme Maddeleri vb.) ve KVKK'nın yurt dışı aktarım kuralları uygulanır.

6. **Saklama süreleri:**
   - hesap verileri hesabını silene kadar;
   - satın alma kayıtları yasal saklama süresi boyunca ([X] yıl);
   - hata raporları [90] gün;
   - destek e-postaları sorun çözüldükten sonra [12] ay.

7. **Hesap silme:** Uygulamada Profil → Hesabı Sil. Ya da support@lumieresucree.app adresine yaz. Silme işlemi hesabı, sunucudaki verileri ve kalan kredileri kalıcı olarak siler. Ayrıntılar `/delete-account` sayfasında.

8. **Hakların:**
   - erişim, düzeltme, silme, taşınabilirlik, işlemeye itiraz ve kısıtlama;
   - rızanı geri alma;
   - şikâyet: Türkiye'de KVKK Kurulu'na, AB/İngiltere'de yerel veri koruma otoritesine.

   Kaliforniya sakinleri için CCPA/CPRA kısa bölümü: kişisel veri satmıyoruz ve paylaşmıyoruz. Taleplere [30] gün içinde yanıt verilir.

9. **Çocuklar:** Uygulama 13 yaş altına (AB'de ülkeye göre 16) yönelik değildir ve bilerek bu yaştakilerden veri toplanmaz.

10. **Güvenlik:**
    - şifreli bağlantı (TLS);
    - erişim kısıtlamaları;
    - veritabanında satır düzeyinde güvenlik.

    Hiçbir yöntemin %100 güvenli olmadığını belirt.

11. **Değişiklikler** ve **iletişim**.

### Kullanım Koşulları (`/terms`)
1. Kabul ve kimler kullanabilir (13+ yaş).
2. **Hizmet:** Yapay zekâ ile pasta görseli ve tarifi üretme. Hizmet "olduğu gibi" sunulur.
3. **Hesap:** Apple veya Google ile giriş. Hesap güvenliği kullanıcının sorumluluğundadır.
4. **Krediler:**
   - Tüketilebilir dijital ürünlerdir.
   - Nakit değeri yoktur ve devredilemez.
   - Satın alma Apple'ın (ileride Google'ın) koşullarına tabidir. İadeler mağazanın iade süreciyle yapılır.
   - Teknik bir hatayla üretilemeyen tasarımların kredisi otomatik iade edilir.
   - Hesap silinince kalan krediler kaybolur.
   - Fiyatlar mağazada gösterilir ve değişebilir.
5. **Yapay zekâ çıktıları:**
   - Görseller tasvir amaçlıdır ve her zaman gerçekçi olmayabilir.
   - Bir pastanenin birebir yapabileceği garanti edilmez.
   - Benzer istekler benzer sonuçlar verebilir.
   - Kullanıcı ürettiği görselleri [kişisel ve ticari olmayan amaçlarla / ticari amaçlar dahil] kullanabilir.
6. **Tarif ve gıda güvenliği uyarısı (önemli):**
   - Tarifler yapay zekâ ile üretilir ve hata içerebilir.
   - Alerjenleri, malzemeleri, pişirme sürelerini ve gıda güvenliğini kullanıcı kendisi kontrol etmelidir.
   - Alerjisi, diyeti veya sağlık durumu olanlar uzmana danışmalıdır.
   - Uygulama tıbbi veya beslenme tavsiyesi vermez.
7. **Kullanıcı içeriği ve yasaklar:**
   - Gerçek kişilerin, markaların veya logoların izinsiz kullanılmaması;
   - yasa dışı, nefret içeren, cinsel veya şiddet içeren içerik olmaması;
   - başkasının telif hakkını ihlal eden fotoğraf yüklenmemesi;
   - hizmeti kötüye kullanma ve tersine mühendislik yapılmaması.

   Kullanıcı yüklediği içerik üzerinde gerekli haklara sahip olduğunu beyan eder.
8. **Fikri mülkiyet:** Uygulamanın tasarımı, adı ve kodu [YASAL AD]'a aittir.
9. Hizmetin değiştirilmesi, askıya alınması ve fesih.
10. Sorumluluğun sınırlandırılması ve garanti reddi (yasaların izin verdiği ölçüde).
11. **Apple'a özel zorunlu maddeler (Apple'ın "Licensed Application EULA" asgari şartları):**
    - sözleşme Apple ile değil geliştiriciyle yapılır;
    - bakım ve destekten geliştirici sorumludur;
    - garanti taleplerinde Apple'ın tek yükümlülüğü satın alma bedelini iade etmektir;
    - ürün talepleri ve fikri mülkiyet taleplerinden Apple sorumlu değildir;
    - ihracat ve yaptırım uyumu;
    - Apple ve iştirakleri bu sözleşmenin üçüncü taraf lehtarıdır.
12. **Uygulanacak hukuk ve yetkili mahkeme:** [ÜLKE / ŞEHİR]. Tüketicilerin zorunlu yerel hakları saklıdır.
13. Değişiklikler ve iletişim.

### Destek (`/support`)
- Destek e-postası ve "genelde [48] saat içinde yanıt veriyoruz" notu.
- **SSS:**
  - Bir tasarım kaç kredi?
  - Krediler görünmüyor → uygulamada Kredilerim → Satın Alımları Geri Yükle.
  - Görsel üretilmezse kredi otomatik iade edilir.
  - İade talebi: Apple'ın reportaproblem.apple.com sayfası.
  - Dil nasıl değişir: cihazın Ayarlar > Genel > Dil ve Bölge bölümünden; uygulama dili ülkeye göre otomatik seçer.
  - Bildirimler gelmiyor.
  - Hesap nasıl silinir.

### Hesap silme (`/delete-account`)
- **Uygulama içinden:** Profil → Hesabı Sil → onayla.
- **Uygulamaya erişemiyorsan:** support@lumieresucree.app adresine, giriş yaptığın e-posta adresinden "Account deletion" konulu bir e-posta gönder. [7] gün içinde işlenir.
- **Neler silinir:** hesap, profil, sunucudaki tasarım ve hatırlatıcı verileri, kalan krediler.
- **Neler kalır:** yasal olarak saklanması gereken satın alma kayıtları [X] yıl, anonim hata raporları en fazla [90] gün.
- Cihazdaki veriler uygulama silinince kaldırılır.

### Üslup
- Sade, samimi, anlaşılır dil kullan; gereksiz hukuk jargonu olmasın.
- Bölümler başlıklı ve gezilebilir olsun: üstte içindekiler bağlantıları.
- Her yasal sayfada "Son güncelleme: [TARİH]" yazsın.
- Gerçekte yapılmayan hiçbir şeyi vaat etme ya da iddia etme. Emin olmadığın yerde `[DOLDUR]` yer tutucusu bırak.

### Teslim
- Klasör yapısı;
- tüm HTML dosyaları ve tek bir `styles.css`;
- `404.html`;
- `README.md`: yayınlama adımları ve doldurulacak yer tutucuların listesi.

---

## Göndermeden önce kontrol et (kendin için)
- [ ] `[YASAL AD]`, adres ve ülkeyi doldur. Şahıs olarak yayınlıyorsan kendi adın görünür.
- [ ] **Gemini API ücretli planda mı?** Ücretsiz planda Google içeriği ürün geliştirmede kullanabiliyor. Bu durumda "eğitimde kullanılmaz" cümlesi doğru olmaz.
- [ ] Sunucu ve veritabanının barındırma sağlayıcısını ve ülkesini yaz.
- [ ] Sunucudaki `cakes`, `special_occasions`, `pastry_orders`, `app_feedback` tabloları gerçekten kullanılıyor mu? Kullanılıyorsa "cihazında kalır" bölümünü güncelle.
- [ ] Bu metin hukuki danışmanlık değildir; yayından önce bir avukata göstermek iyi olur.
- [ ] App Store Connect'teki "Uygulama Gizliliği" formu bu politikayla aynı şeyi söylemeli.
