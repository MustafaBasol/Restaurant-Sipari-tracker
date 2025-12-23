# Mimari Özet

## Bileşenler

- **Frontend:** React + Vite (hash router)
- **Core API:** [services/api](../services/api) (Express 5 + TypeScript + Prisma)
- **DB:** Postgres 16
- **Stripe demo backend:** `server.cjs` (prod’da Caddy altında `/stripe/*`)
- **Opsiyonel print server:** `printer-server.cjs` (prod deploy’da varsayılan olarak public’e açılmaz)

## Frontend → API (mock/real switch)

- Frontend runtime’da `VITE_API_BASE_URL` var mı diye kontrol eder.
  - Yoksa mock API (`localStorage`) kullanır.
  - Varsa `shared/lib/runtimeApi.ts` içindeki `apiFetch()` ile gerçek API’ye gider.

### API base URL kuralları

`VITE_API_BASE_URL` şunları kabul eder:

- Same-origin path: `/api` (prod’da Caddy ile)
- Absolute URL: `https://example.com/api` veya lokal için `http://localhost:4000/api`

## Kimlik doğrulama (session)

- Frontend, localStorage’daki `authState:<deviceId>` içinden `sessionId` okur.
- Her API request’ine `x-session-id: <sessionId>` header’ı ekler.
- API ayrıca alternatif olarak `Authorization: session <id>` formatını da kabul eder.

## İnsan doğrulama (Turnstile)

- Frontend login/kayıt ekranlarında `VITE_TURNSTILE_SITE_KEY` set edilirse Turnstile widget’ı gösterir ve token üretir.
- Token, auth request body içinde `turnstileToken` alanıyla API’ye gönderilir.
- Core API’de `TURNSTILE_ENABLED=true` ise token doğrulaması zorunludur.

## E-posta doğrulama + şifre sıfırlama (MailerSend)

Core API tenant kullanıcıları için e-posta doğrulaması uygular ve şifre sıfırlama akışı sunar.

### Register (gerçek API modu)

- `POST /api/auth/register-tenant` yeni tenant + admin kullanıcı oluşturur.
- Kullanıcı için `emailVerificationTokenHash` + expiry set edilir (token DB’de plaintext tutulmaz).
- MailerSend açıksa doğrulama e-postası gönderilir.
- API, e-posta doğrulanana kadar session oluşturmaz ve `{ emailVerificationRequired: true }` döner.

### Login

- `POST /api/auth/login` tenant kullanıcılarında `emailVerifiedAt` yoksa `EMAIL_NOT_VERIFIED` döndürür.

### Verify

- Frontend linki: `/#/verify-email?token=...`
- Frontend, `POST /api/auth/verify-email` ile doğrulama yapar.
- API token’ı hash’leyip DB’deki hash ile karşılaştırır ve expiry kontrolü yapar.

### Password reset

- İstek ekranı: `/#/forgot-password` → `POST /api/auth/request-password-reset`
  - Hesap var/yok ayrımı yapılmaz; her zaman OK döner.
- Reset linki: `/#/reset-password?token=...` → `POST /api/auth/reset-password`
  - Başarılı olursa kullanıcı şifresi güncellenir ve mevcut session’lar best-effort revoke edilir.

## API hata modeli (frontend)

Frontend `apiFetch()` gerçek API’den gelen `{ "error": "..." }` gövdesini ayrıştırır ve `ApiError` (status + code) olarak fırlatır.
Login/kayıt ekranları bu `code` değerine göre daha net mesaj gösterir.

## Tenant izolasyonu ve RBAC

- API her request’te session’dan `tenantId` + `role` bağlamını çıkarır.
- Tenant izolasyonu: tenant’a ait olmayan veriye erişim engellenir.
- Yetkiler tenant bazlı override edilebilir; default izin seti + tenant override birleşimi ile karar verilir.

## Deploy yönlendirme (Caddy)

Prod deploy’da Caddy aynı origin altında route eder:

- `/api/*` → core API (prefix strip ile API içinde `/health`, `/api/auth/...` gibi path’ler çalışır)
- `/stripe/*` → stripe backend
- `/health` → edge health (Caddy respond)
- `/*` → frontend

Caddy tanımı: [deploy/Caddyfile](../deploy/Caddyfile)

## Health endpoint’leri

- API liveness: `GET /health` → `ok`
- API + DB readiness: `GET /health/db` → DB bağlıysa `ok`, değilse 503

Prod’da Caddy altında:

- `/api/health` → API `/health`
- `/api/health/db` → API `/health/db`
