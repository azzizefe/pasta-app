# Lumière Sucrée API — Hostinger Ubuntu VPS Kurulumu

Amaç: Gemini anahtarı sadece sunucuda dursun, uygulama sunucuya bağlansın.

Gerekenler:
- Hostinger VPS (Ubuntu 22.04 / 24.04), root şifresi veya SSH anahtarı
- Bir alan adı. iPhone uygulamaları HTTPS ister, HTTPS için alan adı şart.
  Alan adın yoksa Supabase'de yaptığın gibi ücretsiz sslip.io adresi kullanabilirsin:
  `api.46-202-153-198.sslip.io` (DNS kaydı gerekmez, 1. adımı atla).
- **Yeni** bir Gemini API anahtarı (aşağıda neden)

> **Supabase ile aynı sunucuya kuruyorsan (46.202.153.198):** Nginx zaten kurulu ve Supabase'i
> yayınlıyor. Mevcut Supabase ayarlarına dokunma; bu rehber ayrı bir adres (`api.` ile başlayan)
> için yeni bir Nginx dosyası ekler. API, Supabase Studio ile çakışmasın diye 3000 yerine
> **3100** portunda çalışır. `apt install` satırı Nginx'i yeniden kurmaz, sadece eksikleri ekler.

---

## 0. Yeni Gemini anahtarı oluştur

Eski anahtar uygulamanın içine gömülüydü (`EXPO_PUBLIC_GEMINI_API_KEY`). Uygulamanın bir derlemesi
herhangi birine gittiyse anahtar çıkarılmış olabilir.

1. https://aistudio.google.com/apikey adresinde **yeni anahtar** oluştur. Sunucuda bunu kullanacaksın.
2. Her şey çalıştıktan sonra **eski anahtarı sil**.

---

## 1. DNS: alan adını sunucuya yönlendir

Hostinger panel → Alan adları → DNS kayıtları:

| Tür | Ad  | Değer            |
|-----|-----|------------------|
| A   | api | VPS'in IP adresi |

Yayılması birkaç dakika sürebilir.

---

## 2. Dosyaları sunucuya gönder (Windows'ta, PowerShell)

`pasta-app` klasöründe:

```powershell
tar --exclude=node_modules -czf server.tgz server
scp server.tgz root@VPS_IP:/tmp/
```

---

## 3. Sunucuya bağlan ve kur

```bash
ssh root@VPS_IP
```

Sunucuda sırayla:

```bash
# Sistem güncelle, Node.js 22 + Nginx + Certbot kur
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx

# Sunucuyu çalıştıracak, yetkisi olmayan kullanıcı
useradd --system --no-create-home --shell /usr/sbin/nologin lumiere

# Dosyaları yerleştir ve paketleri kur
mkdir -p /opt/lumiere-api
tar -xzf /tmp/server.tgz -C /opt/lumiere-api --strip-components=1
cd /opt/lumiere-api && npm install --omit=dev
```

### Gemini anahtarını gir

```bash
cp /opt/lumiere-api/deploy/lumiere-api.env.example /etc/lumiere-api.env
nano /etc/lumiere-api.env      # GEMINI_API_KEY= satırına yeni anahtarı yapıştır, Ctrl+O, Enter, Ctrl+X
chmod 600 /etc/lumiere-api.env
```

### Servisi başlat

```bash
cp /opt/lumiere-api/deploy/lumiere-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now lumiere-api
curl http://127.0.0.1:3100/health
```

`{"status":"ok",...}` görmelisin.

---

## 4. Nginx + HTTPS

```bash
cp /opt/lumiere-api/deploy/nginx-lumiere-api.conf /etc/nginx/sites-available/lumiere-api
sed -i 's/api.ALANADIN.com/api.alanadin.com/' /etc/nginx/sites-available/lumiere-api   # kendi alan adın
ln -s /etc/nginx/sites-available/lumiere-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Ücretsiz SSL sertifikası (otomatik yenilenir)
certbot --nginx -d api.alanadin.com
```

### Güvenlik duvarı

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Hostinger panelinde VPS için ayrı bir güvenlik duvarı açıksa 80 ve 443 portlarına izin ver.

Bilgisayarından test:

```bash
curl https://api.alanadin.com/health
```

---

## 5. Uygulamayı sunucuya bağla

`pasta-app/.env` dosyasında:

```env
EXPO_PUBLIC_AI_BACKEND_URL=https://api.alanadin.com
```

ve `EXPO_PUBLIC_GEMINI_API_KEY=...` satırını **tamamen sil**. Sonra:

```bash
npx expo start -c
```

Bir pasta üretip çalıştığını gör. Mağazaya gidecek derlemeyi bundan sonra al.
Her şey çalışınca Google AI Studio'dan **eski anahtarı sil**.

---

## Sonradan kod güncellemek

Windows'ta (pasta-app klasöründe):

```powershell
tar --exclude=node_modules -czf server.tgz server
scp server.tgz root@VPS_IP:/tmp/
```

Sunucuda:

```bash
tar -xzf /tmp/server.tgz -C /opt/lumiere-api --strip-components=1
cd /opt/lumiere-api && npm install --omit=dev
systemctl restart lumiere-api
```

## Sorun giderme

```bash
systemctl status lumiere-api          # çalışıyor mu?
journalctl -u lumiere-api -n 50       # son loglar (engellenen saldırılar da burada)
tail -n 50 /var/log/nginx/error.log   # Nginx hataları
```
