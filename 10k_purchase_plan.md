# 🎯 10 000 Satın Alma Hedefi – Yol Haritası

## 1️⃣ Ürün‑İçi Dönüşüm Optimizasyonu
| Adım | Açıklama | Beklenen Etki |
|------|----------|---------------|
| **1.1 Ücretsiz Deneme Kredisi** | İlk açılışta 5 kredi otomatik verilir (`CreditsContext`‑e `freeTrialGranted` flagı). | Kullanıcılar hemen deneme yapar → %1‑2 ek dönüşüm |
| **1.2 “Kredi Satın Al” Görünür Buton** | Ana ekran başlığında kalan kredi ve parlak gradient buton. (`HomeScreen.tsx`‑de `styles.headerButton`). | Satın alma farkındalığını artırır |
| **1.3 Dinamik İndirim / Bundle** | 15 kredi + 2 bonus kredi = $2.49 (%13 tasarruf). Fiyat `app.json`‑de tutularak `handlePurchase`‑a parametre eklenir. | Tek seferlik satın alımı %5‑7 yükseltir |
| **1.4 Kredi Yetersizse “Önizleme”** | Kredi kalmadığında düşük‑çözünürlük, su damgası + “Satın Al” CTA gösterilir (`handleLoadSamplePreview`). | Kullanıcıyı hemen ödeme ekranına yönlendirir |
| **1.5 Anlık Push Bildirimi** | Expo‑Push (SDK 58‑uyumlu) ile “Krediniz Bitti – İndirimle Al” mesajı gönderilir (`services/pushService.ts`). | Tekrarlayan satın alımları %8‑10 artırır |
| **1.6 Referral (Davet) Programı** | Arkadaşını davet eden ve davet edilen her iki tarafa 3 kredi verir. Referral kodu `SavedCake` içinde saklanır (`referralCode?`). | Viralliği tetikler → organik büyüme |
| **1.7 A/B‑Test** | Kontrol: normal fiyat. Varyant A: indirimli bundle. Varyant B: referral + bonus kredi. Testi `expo-analytics` ile ölç.
| | En yüksek dönüşüm oranını belirler |

### Hemen uygulanacak kod örnekleri
```tsx
// src/context/CreditsContext.tsx (free‑trial flag)
const [freeTrialGranted, setFreeTrialGranted] = useState(false);
if (!freeTrialGranted && isFirstLaunch) {
  addCredits(5);
  setFreeTrialGranted(true);
}
```
```ts
// src/services/pushService.ts (low‑credit reminder)
export async function scheduleLowCreditReminder(userId: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Kredinizi bitirdiniz', body: '15 kredi paketini %13 indirimle alabilirsiniz!' },
    trigger: { seconds: 10 }, // test; gerçek kullanımda 24 h vb.
  });
}
```

---
## 2️⃣ Pazarlama & Kullanıcı Kazanımı
| Kanal | Eylem | Ölçüm |
|-------|-------|------|
| **Instagram / TikTok Reels** | Kullanıcıların #LumièreSucrée etiketiyle kısa videoları. Sponsorlu postlarla 18‑35 yaş grubuna hedefleme. | Görüntülenme, tıklama, UTM parametresi (`handleShareToApp('instagram')`). |
| **WhatsApp “Kredi Kuponu** | Paylaşım sonrası grup içinde kupon kodu (örn. `WA10`). | Kupon kullanım sayısı (`POST /coupons/redeem`). |
| **Influencer İşbirlikleri** | 5‑10 mikro‑influencer (10k‑50k takipçi) ile canlı pasta tasarlama yayını. Referral linki `?ref=INF123`. | Referral kayıtları → %10‑15 dönüşüm |
| **E‑mail / Push Kampanyaları** | “Hafta sonu %20 indirim” kampanyası, promosyon kodu (`PROMO20`). | Açılma oranı + `handlePurchase` içinde promo kontrolü |
| **App Store Açıklaması** | Açıklamaya “15 kredi = $2.49 – İlk 5 kredi ücretsiz!” satırı eklenir, görselde paylaşım butonları vurgulanır. | İndirme sayısı + “kredi satın al” tıklamaları |

### 12 Hafta Kampanya Takvimi
| Hafta | Aktivite |
|------|----------|
| 1‑2 | Free‑trial + low‑res preview yayına alınır |
| 3‑4 | Instagram/TikTok reels (3 içerik) |
| 5‑6 | Referral kodu + ilk 2 kullanıcıya 5 kredi hediye |
| 7‑8 | A/B‑test (bundle vs normal) ve analiz |
| 9‑10 | Influencer ortaklıkları (her influencer 2 paylaşım) |
| 11‑12 | WhatsApp kupon kampanyası + push hatırlatıcıları |

---
## 3️⃣ Analitik & İzleme
- **Event‑ler** (`expo-analytics`): `credit_purchase_attempt`, `credit_purchase_success`, `referral_used`, `share_instagram`, `share_whatsapp`.
- **Dashboard**: Funnel – *Open App → View Generator → Click Share → Click Purchase → Success*.
- **KPI’lar (12 hafta)**
  - Satın alma dönüşüm oranı **≥ 4 %** (5 000 MAU → 10 000 satın alma).
  - Referral katılımı **%15‑20**.
  - Push‑triggered purchase **%8‑10**.

---
## 4️⃣ Teknik Görev Listesi (Priorite)
| Öncelik | Dosya / Konum | Değişiklik |
|--------|----------------|-----------|
| **P1** | `src/context/CreditsContext.tsx` | Free‑trial flag, low‑credit warning, referral credit ekleme |
| **P2** | `src/screens/HomeScreen.tsx` | Kredi banner & gradient “Kredi Satın Al” butonu |
| **P3** | `src/services/pushService.ts` (yeni) | Expo‑Push schedule & low‑credit hatırlatma |
| **P4** | `src/screens/CakeResultScreen.tsx` | Low‑resolution preview + “Satın Al” CTA |
| **P5** | `src/services/reviewService.ts` | Referral kodu saklama, kupon yönetimi |
| **P6** | `app.json` | In‑app banner / promosyon metni |
| **P7** | `src/components/InfoSheet.tsx` | Referral & promosyon mesajları göster |
| **P8** | `src/services/analytics.ts` | Event‑log eklemeleri |
| **P9** | `src/screens/OnboardingCarousel.tsx` (yeni) | İlk kez gelenler için 3‑sayfalı tanıtım |
| **P10**| `src/screens/SettingsScreen.tsx` | Dil seçici (TR/EN) – global genişleme için |

> **Not:** Tüm eklemeler **Expo SDK 58** dökümantasyonuna uygun yapılmalı; paket sürümleri yükseltilmemeli.

---
## 5️⃣ Riskler & Önlemler
| Risk | Etki | Çözüm |
|------|------|------|
| Kredi API gecikmesi | Kullanıcı beklemekten vazgeçer | Cache (`AsyncStorage`) + optimistic UI |
| Push izinleri reddedilir | Hatırlatıcı çalışmaz | İlk açılışta kısa açıklama ve izin isteği |
| Referral suistimali | Hileli kod üretimi | Tek seferlik kod ve backend doğrulama (`/referral/validate`) |
| Fiyat/İndirim algısı | Çok sık indirim, fiyat algısı bozulur | İndirim kampanyalarını **maksimum 2 ayda bir** sınırlı tut |

---
## 📅 12‑Haftalık Özet Plan
| Hafta | Ana Hedef | Çıktı |
|------|------------|------|
| 1‑2 | Temel dönüşüm iyileştirmeleri | Free‑trial, düşük‑çözünürlük preview, kredi banner |
| 3‑4 | Sosyal paylaşım & viral | Instagram/TikTok reels, `share` butonları ölçüm 
| 5‑6 | Referral & promosyon | Referral kodları, kupon sistemi canlı | 
| 7‑8 | A/B‑test | Bundle vs normal fiyat; en yüksek dönüşüm %3‑4 tespit
| 9‑10| Influencer & WhatsApp | Mikro‑influencer kampanyaları, WhatsApp kuponları |
| 11‑12| Push ve analiz | Low‑credit push hatırlatıcıları, final KPI raporu (hedef 10 k) |

**Başarı ölçütü:** 12 hafta sonunda **10 000** satın alma (veya **≥ 4 %** dönüşüm) elde edilirse hedef tamamlanır; aksi halde A/B‑test sonuçlarına göre yeni bundle/indirim stratejileri devreye alınır.

---
*Bu dosya, pasta‑şefi uygulamanızın 10 000 kredi satın alma hedefini gerçekleştirmek için gerekli ürün‑içi, pazarlama, teknik ve risk yönetimi adımlarını içerir. Gerekli kod değişikliklerini ilgili dosyalara ekleyerek ve takvimdeki aktiviteleri uygulamaya koyarak ilerleyebilirsiniz.*
