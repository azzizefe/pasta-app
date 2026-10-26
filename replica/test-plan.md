# Test planı: Lumière Sucrée

Build: db776ac + çalışma kopyası  Tarih: 2026-10-21  Ortam: yerel Expo web (`localhost`), boş tarayıcı profili (her test 25 kredili yeni kullanıcı)

> `replica/recon.md` yok: bu uygulama bir klon değil. Akışlar doğrudan koddan çıkarıldı (aşağıdaki "Akışlar" listesi).
> Gemini çağrıları testlerde `page.route` ile sahte yanıtla karşılanır; hiçbir test gerçek API'ye gitmez ve para harcamaz.

## Akışlar

| ID | Akış | Ekranlar |
| --- | --- | --- |
| F01 | Giriş (Apple / Google) | LoginScreen |
| F02 | Ana sayfa ve gezinme (sekmeler, kredi rozeti, takvim) | HomeScreen, TabBar |
| F03 | Pasta tasarla ve üret (şablon, sürpriz, form, üretim) | CakeBuilderScreen, CakeResultScreen |
| F04 | Sonuç işlemleri (düzenle, yeniden üret, indir, paylaş, kaydet, büyüt) | CakeResultScreen |
| F05 | Kredi mağazası (paketler, satın alma, geri yükleme) | CreditsScreen |
| F06 | Koleksiyon (liste, filtre, detay, favori, sil) | SavedPane, CakeDetailModal |
| F07 | Özel gün takvimi (ekle, sil, test bildirimi, pastasını tasarla) | OccasionsModal |
| F08 | Profil (dil, sorun bildir, yardım, gizlilik, hakkında, çıkış, hesap sil) | ProfilePane, *Sheet |
| F09 | Kalıcılık (yenileme sonrası kredi, koleksiyon, oturum) | tümü |

## Durumlar

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F01-H1 | F01 | happy | aç, "Sign in with Google" | ana sayfa, "Merhaba Amélie," | e2e | pass |
| F01-E1 | | edge: çift tıklama | Google butonuna iki kez hızlı tıkla | tek oturum, hata yok | e2e | pass |
| F01-E2 | | edge: yenileme | giriş yap, sayfayı yenile | oturum korunur | e2e | pass (BUG-004 düzeltildi) |
| F01-E3 | | edge: ekran okuyucu | giriş ekranı axe taraması | ihlal yok | e2e | fail: BUG-005 |
| F02-H1 | F02 | happy | Home → Saved → Profile → Home | her sekme açılır, aktif sekme işaretli | e2e | pass (BUG-005 düzeltmesinden sonra) |
| F02-H2 | | happy | kredi rozetine dokun | Kredilerim açılır, bakiye 25 | e2e | pass |
| F02-H3 | | happy | takvim butonuna dokun | Özel Gün Takvimi açılır | e2e | pass |
| F02-E1 | | edge: mobil genişlik | 375px'te ana sayfa | yatay taşma yok | e2e | pass |
| F02-E2 | | edge: ekran okuyucu | ana sayfa axe taraması | ihlal yok | e2e | fail: BUG-005 |
| F03-H1 | F03 | happy | Düğün → renk paleti "Fildişi & altın" → Tasarımı Oluştur | görsel gelir, tarif paleti içerir, bakiye 25 → 10 | e2e | pass |
| F03-E1 | | edge: boş form | hiçbir şey seçmeden Tasarımı Oluştur | "Eksik seçim" uyarısı, kredi düşmez | e2e | pass (BUG-003 düzeltildi) |
| F03-E2 | | edge: çok uzun girdi | 2.000 karakterlik ek istek | uygulama donmaz, üretim çalışır | e2e | pass |
| F03-E3 | | edge: emoji ve Türkçe karakter | yazı: "İyi ki doğdun Şule 🎂" | tarifte aynen geçer | e2e | pass |
| F03-E4 | | edge: çift tıklama | Tasarımı Oluştur'a iki kez hızlı tıkla | tek üretim, tek kesinti (25 → 10) | e2e | pass |
| F03-E5 | | edge: yavaş ağ | Gemini yanıtı 5 sn gecikir | yükleme ekranı görünür, sonra görsel | e2e | pass |
| F03-E6 | | edge: geri butonu | üretim sürerken geri | forma döner, kredi tutarlı | e2e | pass (e2e yapıldı) |
| F03-N1 | | negative: yetersiz kredi | bakiye 10 iken üret | "Yetersiz Kredi" uyarısı, kesinti yok | e2e | pass (BUG-003 düzeltildi) |
| F03-N2 | | negative: Gemini 500 hatası | üretim sunucu hatası verir | hata mesajı, kredi iade: bakiye 25 kalır | e2e | pass (BUG-001 düzeltildi) |
| F03-N3 | | negative: çevrimdışı | ağ kesik iken üret | hata mesajı, kredi iade: bakiye 25 | e2e | pass (BUG-001 düzeltildi) |
| F04-H1 | F04 | happy | sonuçta "Düzenle" → not yaz → Uygula | yeni görsel, tarif güncellenir, ikinci kesinti | e2e | pass |
| F04-H2 | | happy | görsele dokun | tam ekran görüntüleyici açılır, kapanır | e2e | pass |
| F04-H3 | | happy | "Kaydet" | Kaydedildi olur, Koleksiyon'da favori | e2e | pass |
| F04-E1 | | edge: düzenle boş not | Düzenle → boş → Uygula | buton pasif, kesinti yok | e2e | pass |
| F04-M1 | | manual: indir / paylaş | iOS cihazda indir ve paylaş | galeriye kayıt, paylaşım menüsü | manual | bekliyor: cihaz |
| F05-H1 | F05 | happy | Kredilerim | 3 paket, %24 ve %39 tasarruf, tasarım başı fiyatlar | e2e | pass |
| F05-H2 | | happy | 200 Kredi satın al (sandbox) | bakiye 25 → 225, başarı mesajı | e2e | pass (BUG-002: yalnız geliştirmede) |
| F05-E1 | | edge: çift tıklama | satın almaya iki kez hızlı tıkla | tek satın alma, bakiye 225 | e2e | pass (BUG-006 düzeltildi) |
| F05-N1 | | negative: gerçek ödeme | App Store sandbox hesabı | gerçek StoreKit akışı | manual | bekliyor: Apple hesabı |
| F06-H1 | F06 | happy | üretimden sonra Saved | tasarım listede | e2e | pass |
| F06-H2 | | happy | tasarımı aç → Sil | listeden kalkar | e2e | pass (BUG-003 düzeltildi) |
| F06-E1 | | edge: boş koleksiyon | yeni kullanıcı Saved | boş durum ve "İlk Pastanı Tasarla" | e2e | pass |
| F07-H1 | F07 | happy | Takvim → + → ad, ay, gün → Kaydet | listede görünür, geri sayım doğru | e2e | pass |
| F07-E1 | | edge: geçersiz tarih | Şubat 31 | kabul edilmez veya düzeltilir | e2e | pass (BUG-007 düzeltildi) |
| F07-N1 | | negative: boş ad | ad girmeden Kaydet | "Eksik Bilgi" uyarısı | e2e | pass (BUG-003 düzeltildi) |
| F07-M1 | | manual: bildirim | iOS'ta Test Et | 2 sn sonra bildirim | manual | bekliyor: cihaz |
| F08-H1 | F08 | happy | Yardım Merkezi → "bildirim" ara | yalnız ilgili sorular kalır | e2e | pass |
| F08-H2 | | happy | Sorun Bildir → 10+ karakter | gönder butonu aktifleşir | e2e | pass |
| F08-H3 | | happy | Çıkış Yap | giriş ekranı | e2e | pass |
| F08-N1 | | negative: Hesabı Sil | sil, onayla, tekrar giriş | veriler silinmiş: 25 kredi, boş koleksiyon | e2e | pass (BUG-008 düzeltildi) |
| F09-H1 | F09 | happy | üret, yenile, giriş | bakiye 10 ve koleksiyon korunur | e2e | pass |
| F09-E1 | | edge: iki sekme | iki sekmede ayrı satın alma | bakiyeler birleşir, kaybolmaz | e2e | pass (BUG-009 düzeltildi, e2e yapıldı) |
