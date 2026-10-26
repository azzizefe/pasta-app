# Hatalar: Lumière Sucrée

Build: db776ac + çalışma kopyası · Tarayıcı: Chromium (Playwright), 390x844 · Tarih: 2026-10-21

Durum özeti: 9 hata. S1: 3 (3 düzeltildi) · S2: 3 (3 düzeltildi) · S3: 3 (2 düzeltildi, 1 kısmen) · S4: 0
Düzeltmeler henüz commit edilmedi; çalışma kopyasında senin commit edilmemiş değişikliklerinle birlikte duruyorlar.

### BUG-001: Üretim başarısız olunca kullanıcı iade yerine fazladan kredi kazanıyor

- Severity: S1
- Flow / case: F03 / F03-N2, F03-N3
- Screen: CakeResultScreen
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. 25 krediyle giriş yap, Düğün Pastası → Altın Lüks → Tasarımı Oluştur.
2. Gemini 500 döner (veya ağ kesik).

Expected: "Görsel Oluşturulamadı", kesilen 15 kredi iade edilir, bakiye 25.
Actual: bakiye 40. Her başarısız üretim 15 bedava kredi veriyordu.
Evidence: F03-N2 ve F03-N3: "Expected: 25, Received: 40".
Suspected cause: `addCredits` / `deductCredits` oluşturuldukları anki eski bakiyeyi kullanıyordu.
Status: fixed (commit edilmedi): `CreditsContext` artık canlı bakiyeyi bir ref üzerinden okuyor.

### BUG-002: Web'de satın alma, ödeme alınmadan kredi veriyor

- Severity: S1
- Flow / case: F05 / F05-H2
- Screen: CreditsScreen
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Web'de giriş yap, Kredilerim → "200 Kredi satın al".

Expected: gerçek ödeme adımı. Web'de ödeme sistemi yokken satın alma kapalı olmalı.
Actual: 1,2 sn sonra bakiye 225, ödeme ekranı yok. Canlı web'de herkes ücretsiz kredi alabilirdi.
Evidence: F05-H2 bakiyeyi ödemesiz 225 yapıyor. `iapService.ts` sandbox simülasyonunda ortam kontrolü yoktu.
Status: fixed (commit edilmedi): simülasyon yalnızca `__DEV__` modunda. Üretim web paketi (`expo export -p web`) ret mesajını içeriyor, `sandbox_` işlem kodunu içermiyor.

### BUG-003: Web'de hiçbir uyarı ve onay penceresi açılmıyor

- Severity: S2
- Flow / case: F03-E1, F03-N1, F06-H2, F07-N1, F08-N1
- Screen: CakeBuilderScreen, SavedPane, OccasionsModal, ProfilePane ve 5 ekran daha
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Boş formla "Tasarımı Oluştur"a bas (veya "Hesabı Sil", tasarım "Sil", adsız özel gün kaydet).

Expected: "Eksik seçim", "Yetersiz Kredi", silme onayı gibi bir pencere.
Actual: hiçbir şey olmuyordu. Web'de hesap ve tasarım silinemiyordu.
Evidence: 5 test "waiting for event dialog" zaman aşımı. `Alert.alert` react-native-web'de boş bir fonksiyon.
Status: fixed (commit edilmedi): yeni `src/utils/alert.ts` (`showAlert`) web'de `alert()`/`confirm()` kullanıyor. 9 dosyadaki 29 çağrı taşındı.

### BUG-004: Sayfa yenilenince oturum kapanıyor

- Severity: S3
- Flow / case: F01 / F01-E2
- Screen: LoginScreen
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Google ile giriş yap. 2. Sayfayı yenile.

Expected: ana sayfa açık kalır.
Actual: giriş ekranı. Kredi ve koleksiyon korunuyor, sadece oturum kayboluyor.
Evidence: F01-E2.
Suspected cause: `App.tsx` oturumu yalnızca bellekte tutuyor.
Status: fixed (commit edilmedi): App.tsx oturumu `@lumiere_auth_session_v1` anahtarıyla saklıyor; F01-E2 geçiyor. Hesap silmede bu anahtar da temizleniyor.

### BUG-005: Erişilebilirlik ihlalleri (axe)

- Severity: S3
- Flow / case: F01-E3, F02-E2, F02-H1, builder, Kredilerim
- Screen: TabBar, StylePresets, birden çok ekran
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Her ekranda axe taraması.

Expected: ihlal yok.
Actual ve durum:
- düzeltildi: critical `aria-required-parent` (sekmeler artık `tablist` içinde), sekmelerde `aria-selected` (F02-H1 geçiyor), critical `image-alt` (şablon görselleri)
- açık: serious `color-contrast` (soluk metin #A98F68), serious `label-content-name-mismatch` (ör. üstü çizili "20" buton adında yok), moderate `region` (landmark yok)

Evidence: `e2e/a11y.spec.ts` (açık kısımlar için `test.fail` ile işaretli).
Status: kısmen düzeltildi (commit edilmedi). Kalanlar renk ve metin kararı gerektiriyor.

### BUG-006: Satın almaya çift tıklama iki kez satın alma yapıyor

- Severity: S1
- Flow / case: F05 / F05-E1
- Screen: CreditsScreen
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Kredilerim → "200 Kredi satın al"a çift tıkla.

Expected: tek satın alma, bakiye 225.
Actual: bakiye 425: iki ayrı satın alma. Gerçek mağazada iki ödeme demek. BUG-001'deki eski bakiye hatası bunu tesadüfen gizliyordu.
Evidence: F05-E1 "Expected: 225, Received: 425".
Status: fixed (commit edilmedi): aynı anda tek satın almaya izin veren bir kilit (ref).

### BUG-007: Ayın gün sayısından büyük tarih (31 Şubat) kabul ediliyor

- Severity: S3
- Flow / case: F07 / F07-E1
- Screen: OccasionsModal
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Takvim → + → ad, Şubat, gün 31 → Kaydet.

Expected: "Geçersiz Tarih" uyarısı.
Actual: "Hatırlatıcı Kuruldu". Tarih 3 Mart'a kayıyor, geri sayım ve hatırlatma yanlış güne kuruluyor.
Evidence: F07-E1 (dialog mesajı "Hatırlatıcı Kuruldu ✨").
Status: fixed (commit edilmedi): ayın gün sayısı kontrolü eklendi. 29 Şubat geçerli kaldı.

### BUG-008: "Hesabı Sil" hiçbir veriyi silmiyor

- Severity: S2
- Flow / case: F08 / F08-N1
- Screen: ProfilePane
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. Bir tasarım üret (bakiye 10). 2. Profil → Hesabı Sil → onayla. 3. Tekrar giriş yap.

Expected: 25 kredi, boş koleksiyon. Gizlilik politikası ve App Store 5.1.1(v) bunu istiyor.
Actual: bakiye 10, tasarım duruyor. Buton sadece çıkış yapıyordu.
Evidence: F08-N1 "Kredi bakiyesi 25" bulunamadı.
Status: fixed (commit edilmedi): yeni `accountService.wipeLocalAccountData` tüm `@lumiere_*` verilerini ve planlı hatırlatıcıları siliyor, veri sağlayıcıları sıfırlanıyor.

### BUG-009: İki sekmede aynı krediler iki kez harcanabiliyor

- Severity: S2
- Flow / case: F09 / F09-E1
- Screen: CakeBuilderScreen
- Build: db776ac + çalışma kopyası  Browser / device: Chromium, 390px

Steps
1. 30 krediyle iki sekmede giriş yap. 2. Her sekmede bir tasarım üret.

Expected: bakiye 0.
Actual: bakiye 15. İkinci tasarım bedava; Gemini maliyeti yine de ödeniyor.
Evidence: F09-E1 "Expected: 0, Received: 15".
Status: fixed (commit edilmedi): web'de sekmeler `storage` olayıyla bakiyeyi senkron tutuyor. Kalıcı çözüm sunucu tarafı kredi defteri (yol haritası Faz 1).

## Kontrol edilecek

- Aynı milisaniyede iki sekmeden harcama hâlâ yarışabilir. Bunu yalnızca sunucu tarafı kredi kapatır.
- iOS'ta indir ve paylaş (F04-M1), App Store sandbox satın alması (F05-N1) ve test bildirimi (F07-M1) cihaz gerektiriyor.
