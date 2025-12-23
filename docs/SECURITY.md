# Güvenlik (Deploy Checklist)

Bu repo demo/POC odaklı olsa da, **prod ortamında** yanlış yapılandırma kaynaklı riskleri azaltmak için bazı korumalar ve varsayılanlar içerir.

## Kapsam

- Frontend (Vite/React): servis URL doğrulaması (origin allowlist + prod’da https zorunluluğu)
- Stripe demo backend: `server.cjs`
- Opsiyonel Print Server: `printer-server.cjs`

## 1) Ortam değişkenleri

### Frontend (Vite)

- `VITE_STRIPE_BACKEND_URL`
  - Stripe backend base URL (örn. `https://api.example.com` veya local `http://localhost:4242`).
- `VITE_PRINT_SERVER_URL` (opsiyonel)
  - Print server base URL (örn. `http://localhost:4243`).
- `VITE_SERVICE_ORIGIN_ALLOWLIST` (opsiyonel, önerilir)
  - Virgülle ayrılmış origin listesi.
  - Örn: `https://api.example.com,https://print.example.com`
  - Prod’da **tanımlı değilse** varsayılan davranış: **yalnızca same-origin** (örn. `window.location.origin`).
- `VITE_ALLOW_INSECURE_SERVICES` (opsiyonel)
  - Prod’da varsayılan olarak servis URL’leri **https** olmalıdır.
  - Bu değişken `true` yapılırsa prod’da `http://...` servislerine izin verilebilir (yalnızca bilinçli kullanın).

Örnek dosya: `.env.local.example`

### Stripe backend (`server.cjs`)

- `STRIPE_SECRET_KEY` (zorunlu)
- `STRIPE_PRICE_ID_MONTHLY` (zorunlu)
- `CORS_ORIGINS` (zorunlu)
  - Origin allowlist. Hash/path olmadan origin verin.
  - Örn: `https://app.example.com`
  - Demo kolaylığı için wildcard desteklenir (örn. `https://*.app.github.dev`).
- `PORT` (opsiyonel, varsayılan 4242)
- `STRIPE_WEBHOOK_SECRET` (opsiyonel ama webhook kullanacaksanız pratikte zorunlu)
- `API_KEY` (opsiyonel)
  - Set edilirse, webhook hariç tüm endpoint’ler `x-api-key` header’ı ister.

Örnek dosya: `.env.example`

### Core API (`services/api`)

- `DATABASE_URL` (zorunlu)
- `CORS_ORIGINS` (zorunlu; origin allowlist)
- `SESSION_TTL_DAYS` (opsiyonel)
- `TURNSTILE_ENABLED` (opsiyonel)
  - `true` ise, `POST /api/auth/login` ve `POST /api/auth/register-tenant` için insan doğrulaması zorunlu olur.
- `TURNSTILE_SECRET_KEY` (TURNSTILE_ENABLED=true iken pratikte zorunlu)

Not: `TURNSTILE_ENABLED=true` iken secret key yoksa API 500 döner (misconfiguration).

#### MFA (2FA) — TOTP

Core API, TOTP tabanlı MFA (Authenticator app) desteği sağlar.

- Kurulum:
  - `POST /api/auth/mfa/setup`: kullanıcıya özel secret üretir ve DB’ye yazar; `{ secret, otpauthUri, issuer }` döner.
  - `POST /api/auth/mfa/verify`: 6 haneli TOTP kodunu doğrular ve `mfaEnabledAt` set eder.
- Login:
  - `mfaEnabledAt` set edilmişse login sırasında `mfaCode` zorunludur.
  - Hata kodları: `MFA_REQUIRED`, `MFA_INVALID`.
- Tenant admin iptal:
  - Yalnızca tenant admin, kullanıcı bazında `POST /api/users/:id/mfa/disable` ile MFA’yı kapatabilir.

Ortam değişkenleri:

- `MFA_ISSUER` (opsiyonel): Authenticator uygulamalarında görünen issuer adı.

#### E-posta (MailerSend) — doğrulama + şifre sıfırlama

Core API, tenant kullanıcıları için e-posta doğrulaması ve şifre sıfırlama akışı destekler.

- `MAILERSEND_ENABLED` (opsiyonel)
  - `true` ise MailerSend üzerinden e-posta gönderilir.
- `MAILERSEND_API_KEY` (MAILERSEND_ENABLED=true iken pratikte zorunlu)
- `MAILERSEND_FROM_EMAIL` (MAILERSEND_ENABLED=true iken pratikte zorunlu)
- `MAILERSEND_FROM_NAME` (opsiyonel)
- `APP_PUBLIC_URL` (MAILERSEND_ENABLED=true iken pratikte zorunlu)
  - E-posta linklerinin yönleneceği frontend base URL.
  - Hash router kullandığımız için linkler `/#/verify-email?token=...` ve `/#/reset-password?token=...` şeklinde üretilir.
- `EMAIL_VERIFICATION_TTL_MINUTES` (opsiyonel, varsayılan 60)
- `PASSWORD_RESET_TTL_MINUTES` (opsiyonel, varsayılan 30)

Güvenlik notları:

- Tokenlar DB’de **hash’li** saklanır; plaintext token yalnızca e-posta linkinde bulunur.
- `request-password-reset` endpoint’i hesap var/yok bilgisini sızdırmamak için her zaman başarı döner (enumeration azaltma).
- Şifre sıfırlama başarılı olursa mevcut session’lar best-effort revoke edilir.

### Print Server (`printer-server.cjs`)

- `CORS_ORIGINS` (zorunlu)
- `PORT` (opsiyonel, varsayılan 4243)
- `API_KEY` (opsiyonel)
  - Set edilirse tüm endpoint’ler `x-api-key` ister.
- `PRINT_TRANSPORT` (opsiyonel)
  - `stdout` | `tcp9100` | `cups`

Örnek dosya: `.env.printer-server.example`

## 2) Prod doğrulama kuralları (Frontend)

Frontend, Stripe backend ve Print Server gibi servis URL’leri için şunları doğrular:

- Sadece `http:` veya `https:` protokolüne izin verilir
- URL içinde `username:password@...` gibi kimlik bilgisi taşınmasına izin verilmez
- URL hash (`#...`) kabul edilmez
- `origin`, allowlist içinde olmalıdır
- Prod’da varsayılan olarak `https` zorunludur (override: `VITE_ALLOW_INSECURE_SERVICES=true`)

Bu kontrol, yanlış env ayarıyla isteklerin beklenmeyen origin’lere gitmesini engellemek içindir.

## 3) Backend hardening (özet)

### `server.cjs`

- `helmet` ile güvenlik başlıkları
- `express-rate-limit` ile rate limiting
- `x-powered-by` kapalı
- JSON body limit: `256kb`
- Webhook route: `express.raw({ limit: '1mb' })` ve `STRIPE_WEBHOOK_SECRET` yoksa işlenmez
- Redirect URL doğrulaması: `successUrl/cancelUrl/returnUrl` sadece `CORS_ORIGINS` allowlist origin’lerine izin verir
- Opsiyonel `API_KEY` doğrulaması (webhook hariç)

### `printer-server.cjs`

- `helmet` + `express-rate-limit`
- `x-powered-by` kapalı
- JSON body limit: `1mb`
- Opsiyonel `API_KEY` doğrulaması

## 4) Minimum prod checklist

- Frontend:
  - `VITE_SERVICE_ORIGIN_ALLOWLIST`’i prod domainlerinize göre set edin.
  - `VITE_ALLOW_INSECURE_SERVICES` **kullanmayın** (mecbur değilseniz).
- Stripe backend:
  - `CORS_ORIGINS`’i yalnızca gerçek app origin’lerine göre set edin.
  - `STRIPE_WEBHOOK_SECRET`’i set edin (webhook kullanıyorsanız).
  - `API_KEY` ile endpoint’leri korumayı değerlendirin.
- Print Server:
  - Mümkünse internal ağda tutun.
  - `CORS_ORIGINS` ve `API_KEY` ile erişimi kısıtlayın.

## 5) Güvenlik bildirimi

Bir güvenlik zafiyeti bulduğunuzu düşünüyorsanız `info@kitchorify.com` adresinden detaylarıyla bildirebilirsiniz.
