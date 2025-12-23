# Production Hazırlık (Go‑Live) – Kitchorify

Bu doküman, bu repoda yapılan **prod hardening + VPS deploy** çalışmalarını tek yerde özetler ve “şu an prod için hazır mıyız?” sorusuna **kapsamı netleştirerek** yanıt verir.

> Not: Bu repo uygulama tarafında **demo/POC** odaklıdır (mock API + `localStorage`). Aşağıdaki “prod” ifadesi, **VPS üzerinde güvenli yayınlama ve yanlış yapılandırma risklerini azaltma** anlamındadır; tam anlamıyla “kurumsal production” (kalıcı DB, gerçek auth, gözlemlenebilirlik, SLA, yedekleme vb.) seviyesini garanti etmez.

## 1) Kapsam (Neyi prod’a alıyoruz?)

**Bu repo ile prod’da yapılabilenler (önerilen kullanım):**

- Vite ile build edilen frontend’in güvenli şekilde (HTTPS) yayınlanması
- Stripe demo backend’in aynı origin altında `/stripe/*` ile yayınlanması
- Print Server’ın **public internete açılmaması** (varsayılan)

**Bu repo ile “gerçek production” için eksik olan tipik parçalar:**

- Kalıcı sunucu DB (Postgres vs), migration, yedekleme
- Server-side auth (JWT/session) + rol/tenant enforcement (backend)
- Audit/telemetri/log yönetimi, alarm/monitoring
- Secrets yönetimi (Vault/SSM), rotasyon politikaları

## 2) Uygulanan güvenlik önlemleri (özet)

### Frontend (Vite/React)

- Servis URL doğrulaması:
  - Sadece `http/https`
  - URL içinde `username:password@` reddedilir
  - Hash (`#`) reddedilir
  - **Origin allowlist** kontrolü
  - Prod’da varsayılan **HTTPS zorunluluğu** (opsiyonel override: `VITE_ALLOW_INSECURE_SERVICES=true`)
- Yanlış env/URL durumunda istekler bloklanır ve kullanıcıya uyarı gösterilir.

### Stripe backend (server.cjs)

- `helmet` güvenlik başlıkları
- `express-rate-limit` ile rate limit
- `x-powered-by` kapalı
- Body limitler:
  - JSON: `256kb`
  - Webhook raw: `1mb`
- `CORS_ORIGINS` allowlist
- Redirect URL doğrulaması (open redirect riskini azaltır): `successUrl/cancelUrl/returnUrl` yalnızca `CORS_ORIGINS` origin’lerine izin verir
- Opsiyonel API anahtarı: `API_KEY` set edilirse (webhook hariç) `x-api-key` zorunlu
- Webhook güvenliği: `STRIPE_WEBHOOK_SECRET` yoksa webhook işlenmez

### Print Server (printer-server.cjs)

- `helmet` + `express-rate-limit`
- `x-powered-by` kapalı
- JSON limit: `1mb`
- Opsiyonel `API_KEY` (tüm endpoint’ler `x-api-key` ister)

### VPS edge (Caddy)

- Otomatik TLS/HTTPS
- Güvenlik başlıkları (HSTS, nosniff, frame deny, referrer policy, permissions policy)
- Same-origin proxy yaklaşımı:
  - Frontend → `https://<domain>/stripe` → backend

İlgili dosyalar:

- `docs/SECURITY.md` (env + checklist)
- `deploy/README.md` (VPS kurulum)
- `deploy/Caddyfile` (edge proxy + headers)
- `deploy/docker-compose.yml` (servisler; print server varsayılan kapalı)

## 3) Prod kurulum (önerilen yol)

1. DNS

- `kitchorify.com` (ve gerekiyorsa `www`) için A kaydı → VPS IP

2. Firewall

- Açık: `22/tcp`, `80/tcp`, `443/tcp`
- Kapalı: backend portları (4242/4243) **public internete açılmamalı**

3. Env

- VPS’de `deploy/.env.production` oluşturun:
  - `DOMAIN=kitchorify.com`
  - `ACME_EMAIL=...`
  - `CORS_ORIGINS=https://kitchorify.com`
  - `VITE_STRIPE_BACKEND_URL=https://kitchorify.com/stripe`
  - `STRIPE_SECRET_KEY=...`
  - `STRIPE_PRICE_ID_MONTHLY=...`
  - (önerilir) `STRIPE_WEBHOOK_SECRET=...`
  - (opsiyonel) `STRIPE_API_KEY=...` (Caddy upstream’e header enjekte eder)

4. Çalıştırma

- `deploy/README.md` içindeki komutlarla:
  - `docker compose --env-file .env.production up -d --build`

5. Sağlık kontrol

- `https://kitchorify.com/health` → `ok`
- `https://kitchorify.com/#/` → UI açılır

## 4) Print Server stratejisi (prod önerisi)

- Varsayılan olarak **public değil**; Caddy’de `/print` route yoktur.
- En güvenlisi: Print Server’ı restoran LAN/VPN içinde çalıştırmak.
- VPS üzerinde açmanız gerekiyorsa:
  - Compose’da `--profile print`
  - Caddy’de ayrıca `/print/*` route’unu bilinçli şekilde açmanız gerekir
  - Mutlaka `API_KEY` + dar `CORS_ORIGINS` kullanın

## 5) “Şu an prod için hazır mıyız?” (dürüst değerlendirme)

**Evet, şu koşullarda “prod’a çıkılabilir” durumdasınız:**

- Hedefiniz, frontend’i HTTPS ile yayınlamak ve Stripe demo backend’i same-origin `/stripe` altında çalıştırmaksa
- `CORS_ORIGINS` sadece gerçek domain’leri içeriyorsa
- `STRIPE_WEBHOOK_SECRET` set edildiyse (webhook kullanıyorsanız)
- Backend portları public internete açılmadıysa
- (tercihen) API anahtarı koruması etkinleştirildiyse (`API_KEY` / `STRIPE_API_KEY`)

**Ama “tam production-ready SaaS” demek için halen kritik boşluklar var (kapsam gereği):**

- Uygulama verisi `localStorage` tabanlı (sunucu DB yok) → cihaz kaybı / multi-cihaz senkron / veri bütünlüğü riskleri
- Gerçek backend auth/authorization yok → tenant/role enforcement server-side değil
- Gözlemlenebilirlik/alarmlar yok (log toplama, uptime monitor, error tracking)
- Güçlü CSP gibi ek tarayıcı sertleştirme opsiyonel (ihtiyaca göre Caddy’de sıkılaştırılmalı)

Özet karar:

- **Marketing + demo uygulama yayını için:** büyük ölçüde hazır.
- **Gerçek restoran operasyonu (kalıcı sipariş DB, muhasebe, SLA) için:** gerçek backend/DB katmanı eklenmeden “tam prod” saymayın.

## 6) Go‑Live checklist (kısa)

- [ ] DNS A kaydı doğru
- [ ] Firewall yalnızca 22/80/443 açık
- [ ] `deploy/.env.production` dolduruldu (secret’lar repoda değil)
- [ ] `CORS_ORIGINS=https://kitchorify.com` (minimum)
- [ ] `VITE_STRIPE_BACKEND_URL=https://kitchorify.com/stripe`
- [ ] Webhook kullanılıyorsa `STRIPE_WEBHOOK_SECRET` set
- [ ] Opsiyonel: API key koruması etkin (`API_KEY` ve/veya `STRIPE_API_KEY`)
- [ ] `https://kitchorify.com/health` OK
- [ ] Print Server public değil (varsayılan)
