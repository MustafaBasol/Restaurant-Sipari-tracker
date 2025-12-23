<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Restaurant Sipariş Takip (Kitchorify / Restaurant OS)

Çok kiracılı (multi-tenant), çok dilli restoran sipariş yönetim uygulaması. Garson, mutfak ve admin rolleriyle; masa, menü ve sipariş akışını tek arayüzde yönetmeyi hedefler. Demo/POC amaçlı olarak backend yerine tarayıcı `localStorage` üzerinde çalışan mock API kullanır.

## Özellikler

- **Roller:** Super Admin, Admin, Garson (Waiter), Mutfak (Kitchen)
- **Masa yönetimi:** masa durumu (boş/dolu) ve sipariş akışı
- **Menü yönetimi:** kategori + ürün, ürün müsaitlik durumu
- **Menü seti (bundle):** birden fazla ürünü set menü olarak tanımlama ve siparişe ekleme (demo)
- **Sipariş akışı:** garson sipariş oluşturur/günceller, mutfak item statülerini ilerletir
- **Stok / tükendi:** tükendi ürünlerin garson/mutfak ekranlarına yansıması + backend tarafında engelleme
- **Mutfak SLA:** sipariş yaşı (dk) + “gecikti” göstergesi (demo)
- **Raporlama:** günlük özet + garson performansı + top items + gün sonu kırılımı (mock veriden)
- **Dil desteği:** EN/TR/FR (JSON çeviriler)
- **Abonelik/deneme süresi:** deneme bitince uygulama erişimi “subscription ended” ekranına yönlenir
- **Yetkilendirme matrisi:** tenant bazlı izin matrisi (UI gating + backend enforcement)
- **Audit log:** kritik aksiyonlar için denetim izi + admin ekranı
- **Cihaz/oturum yönetimi:** çoklu cihaz/sekme oturumları + kullanıcı/admin için oturum sonlandırma
- **Offline mod (demo):** client cache + outbox replay + basit conflict log

## Teknoloji

- React 19 + TypeScript
- Vite
- UI: TailwindCSS (CDN üzerinden, `index.html` içinde tema tanımı)
- Ödeme: Stripe Elements (demo entegrasyonu, ödeme onayı mock)

## Hızlı Başlangıç

**Gereksinimler:** Node.js (öneri: 18+), npm

1. Bağımlılıkları kur:

```bash
npm install
```

2. Geliştirme sunucusunu başlat:

```bash
npm run dev
```

3. Tarayıcıdan aç:

- http://localhost:3000

## Komutlar

```bash
# Dev
npm run dev

# Prod build
npm run build

# Build çıktısını yerelde preview
npm run preview

# Repo doğrulama (format + lint + typecheck + build)
npm run check
```

## Demo Hesapları

Uygulama ilk açılışta mock verilerle gelir.

| Rol         | Email                       | Şifre / Tenant Slug |
| ----------- | --------------------------- | ------------------- |
| Super Admin | `superadmin@kitchorify.com` | `superadmin`        |
| Admin       | `admin@sunsetbistro.com`    | `sunset-bistro`     |
| Garson      | `waiter@sunsetbistro.com`   | `sunset-bistro`     |
| Mutfak      | `kitchen@sunsetbistro.com`  | `sunset-bistro`     |

Not: Tenant kullanıcıları için girişte ikinci alan “şifre/slug” gibi davranır; demo veride şifre olarak tenant slug kullanılır.

## Routing (Hash Router)

Uygulama hash tabanlı route kullanır:

- `#/` pazarlama ana sayfa
- `#/login`, `#/register`
- `#/app` uygulama paneli (role göre ekran)
- `#/subscription-ended` deneme/abonelik bitince
- `#/checkout` ödeme ekranı
- `#/privacy`, `#/terms`

## Mock Backend ve Veri Sıfırlama

Bu repo, demo amaçlı **gerçek backend olmadan** çalışır. Veri mock API üzerinden `localStorage`’a yazılır.

- DB anahtarı: `kitchorify-db`
- Oturum anahtarları (cihaz bazlı): `authState:<deviceId>`
- Cihaz kimliği (sessionStorage): `kitchorify-device-id`
- Offline cache/outbox (demo):
  - Client DB: `kitchorify-db-client:<deviceId>`
  - Outbox: `kitchorify-outbox:<deviceId>`
  - Conflict log: `kitchorify-sync-conflicts:<deviceId>`

Veriyi sıfırlamak için tarayıcıda bu anahtarları silin (veya “Site Data/Clear Storage” ile temizleyin), ardından sayfayı yenileyin.

## Yazıcı (Adisyon / Mutfak Fişi)

Bu repo frontend-only demo olduğu için yazdırma iki şekilde çalışır:

1. **Varsayılan (tarayıcı yazdırma):** Garson sipariş ekranında “Adisyon Yazdır” ve “Mutfak Fişi Yazdır” ile tarayıcı yazdırma penceresi açılır.

2. **Opsiyonel Print Server (gelişmiş entegrasyon):** Eğer cihaz/termal yazıcıya doğrudan göndermek isterseniz örnek sunucu: `printer-server.cjs`.

Örnek env: `.env.printer-server.example`

Çalıştırma:

```bash
npm install
npm install express cors dotenv

# Terminal 1: print server
PORT=4243 CORS_ORIGINS=http://localhost:3000 node printer-server.cjs

# Terminal 2: frontend (print server'a job göndermek için)
VITE_PRINT_SERVER_URL=http://localhost:4243 npm run dev
```

#### Print Server güvenlik notları (printer-server.cjs)

- **CORS allowlist:** `CORS_ORIGINS` ile origin allowlist.
- **Rate limit + Helmet:** temel hardening.
- **Opsiyonel API anahtarı:** `API_KEY` tanımlarsanız tüm endpoint’ler `x-api-key` ister.

Frontend tarafında prod’da print server URL’leri de allowlist/https kurallarına tabidir.

Print server yazıcıya gönderim için `PRINT_TRANSPORT` ile çalışır:

- `PRINT_TRANSPORT=stdout` (varsayılan): Gelen işleri terminale yazar.
- `PRINT_TRANSPORT=tcp9100`: Network termal yazıcıya RAW TCP (genelde 9100 port) ile ESC/POS gönderir.
- `PRINT_TRANSPORT=cups`: Linux üzerinde CUPS kuyruğuna `lp` komutu ile RAW gönderir.

Örnekler:

```bash
# 1) Sadece log (demo)
PORT=4243 CORS_ORIGINS=http://localhost:3000 PRINT_TRANSPORT=stdout node printer-server.cjs

# 2) Network termal yazıcı (ESC/POS, RAW 9100)
PORT=4243 CORS_ORIGINS=http://localhost:3000 PRINT_TRANSPORT=tcp9100 PRINTER_HOST=192.168.1.50 PRINTER_PORT=9100 node printer-server.cjs

# 3) CUPS (lp gerekli)
PORT=4243 CORS_ORIGINS=http://localhost:3000 PRINT_TRANSPORT=cups PRINTER_NAME=EPSON_TM_T20 node printer-server.cjs
```

Notlar:

- `tcp9100`/`cups` yolları ESC/POS gönderir. UTF-8 her firmware’de kusursuz olmayabilir; bazı yazıcılarda Türkçe karakterler için codepage ayarı gerekebilir.
- `cups` için sistemde CUPS ve `lp` komutu kurulu olmalıdır.
- Print Server URL ayrıca uygulama içinde **Admin → Ayarlar → Yazıcı** bölümünden restoran (tenant) bazında da tanımlanabilir.

## Abonelik / Stripe Notları

- Bu repo şu an **Stripe Checkout (subscription mode)** ile çalışacak şekilde ayarlanmıştır.
  - Frontend, backend’in döndürdüğü **Checkout Session URL**’ine yönlendirir.
  - Bu akışta frontend tarafında `pk_test_...` (publishable key) zorunlu değildir.

### Güvenlik

- `sk_test_...` gibi **secret key** değerlerini asla frontend env (`VITE_*`) içine koymayın, repoya commit etmeyin ve paylaşmayın.
- Yanlışlıkla paylaşıldıysa Stripe Dashboard → Developers → API keys üzerinden **hemen Rotate/Revoke** edin.

#### Demo backend güvenlik notları (server.cjs)

Bu repodaki Stripe backend örneği (`server.cjs`) demo amaçlıdır ama temel hardening içerir:

- **CORS allowlist:** `CORS_ORIGINS` ile origin allowlist uygulanır.
- **Redirect URL doğrulaması:** `successUrl`, `cancelUrl`, `returnUrl` yalnızca `CORS_ORIGINS` içindeki origin’lere izin verecek şekilde doğrulanır (open redirect riskini azaltır).
- **Rate limit + Helmet:** istekleri sınırlar ve temel HTTP güvenlik başlıklarını ekler.
- **Opsiyonel API anahtarı:** `API_KEY` tanımlarsanız (webhook hariç) tüm endpoint’ler `x-api-key` ister.
- **Webhook güvenliği:** `STRIPE_WEBHOOK_SECRET` yoksa webhook işlenmez.

Not: Bunlar demo için “makul” önlemlerdir; production’da ayrıca gerçek auth, kalıcı DB, secrets yönetimi, gözlemlenebilirlik vb. gerekir.

### Lokal Stripe Test Kurulumu (önerilen)

Örnek env: `.env.example` (backend) ve `.env.local.example` (frontend)

1. Stripe Dashboard (Test mode) içinde aylık bir **Price** oluşturun ve `price_...` değerini alın.

2. Backend için `.env` oluşturun (bu repo içindeki `server.cjs` ile):

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
CORS_ORIGINS=http://localhost:3000
PORT=4242

# Opsiyonel: API anahtarı koruması
# API_KEY=change-me
```

3. Frontend için `.env.local` oluşturun:

```bash
VITE_STRIPE_BACKEND_URL=http://localhost:4242

# Opsiyonel (önerilir): Frontend'in istek atacağı servis origin allowlist'i
# VITE_SERVICE_ORIGIN_ALLOWLIST=http://localhost:4242,http://localhost:4243

# Üretimde varsayılan: servis URL'leri https olmalı.
# Sadece bilinçli olarak prod'da http servislerine izin vermek istiyorsanız:
# VITE_ALLOW_INSECURE_SERVICES=true
```

4. Çalıştırma:

```bash
# Terminal 1
node server.cjs

# Terminal 2
npm run dev
```

### GitHub Codespaces Notu

- Frontend URL’niz örn. `https://<codespace>-3000.app.github.dev` ise backend’i **ayrı bir porttan** açın (örn. 4242) ve Ports panelinden public/visibility ayarını yapın.
- Bu durumda frontend env şöyle olmalı:

```bash
VITE_STRIPE_BACKEND_URL=https://<codespace>-4242.app.github.dev
```

- `CORS_ORIGINS` içinde **origin** kullanın (hash dahil değil):
  - ✅ `https://<codespace>-3000.app.github.dev`
  - ❌ `https://<codespace>-3000.app.github.dev/#/app`

- (Demo kolaylığı) `server.cjs`, `CORS_ORIGINS` için `*` wildcard destekler:
  - Örn: `CORS_ORIGINS=https://*.app.github.dev`

### Frontend servis URL güvenliği (prod)

Frontend, harici servis URL’leri (Stripe backend + Print Server) için prod’da güvenli varsayılanlar uygular:

- `VITE_SERVICE_ORIGIN_ALLOWLIST` **tanımlı değilse** prod’da yalnızca **same-origin** kabul edilir (örn. `window.location.origin`).
- Prod’da varsayılan olarak **HTTPS zorunludur**.
- `VITE_ALLOW_INSECURE_SERVICES=true` sadece bilinçli olarak prod’da `http://...` servisleri açmak için kullanılmalıdır.

Bu yaklaşım, yanlış yapılandırılmış env’lerden kaynaklı isteklerin “beklenmeyen” origin’lere gitmesini engellemeyi hedefler.

### Demo Aktivasyon Notu

- Ödeme dönüşü (success) sonrasında tenant’ı ACTIVE yapan kısım şu an **demo amaçlı mock**tur.
- Gerçek hayatta bu aktivasyon, Stripe **webhook** event’leri (örn. `checkout.session.completed`, `invoice.payment_succeeded`) ile backend/DB üzerinde yapılmalıdır.

## Proje Yapısı (Özet)

- `app/` uygulama giriş ve router/provider katmanı
- `features/` domain bazlı modüller (auth, orders, tables, menu, users, subscription, reports, vb.)
- `shared/` ortak UI bileşenleri, i18n, tipler ve mock API
- `locales/` çeviri JSON dosyaları

## Notlar

- Bu repo demo/POC amaçlıdır; “server” tarafı tarayıcı `localStorage` üzerinde simüle edilir.
- Daha production yaklaşımlar için: gerçek backend + gerçek zamanlı senkron (örn. WebSocket) + güvenli auth gerekir.

## Geliştirme / İyileştirme Takibi

- Teknik borç ve ilerleme: `docs/IMPROVEMENTS.md`
- Ürün / ihtiyaç analizi (restoran sahibi gözüyle): `docs/RESTAURANT_OWNER_REVIEW.md`
