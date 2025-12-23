# Geliştirme Rehberi

Bu repo iki modda çalışır:

- **Mock/Demo mod (varsayılan):** `VITE_API_BASE_URL` yoksa frontend `localStorage` tabanlı mock API ile çalışır.
- **Gerçek API modu:** `VITE_API_BASE_URL` varsa frontend istekleri Postgres destekli core API’ye gider.

## Komutlar

- Frontend dev: `npm run dev` (varsayılan port: 3000)
- Repo doğrulama: `npm run check` (format + lint + typecheck + build)

## Gerçek API ile lokal geliştirme (önerilen akış)

Bu akışta Vite dev server (3000) → Core API (4000) farklı origin olduğu için API tarafında `CORS_ORIGINS` tanımlamalısınız.

### 1) Postgres (lokal Docker)

Örnek (lokal docker ile port publish ederek):

```bash
docker rm -f kitchorify-postgres 2>/dev/null || true

docker run -d --name kitchorify-postgres \
  -e POSTGRES_DB=kitchorify \
  -e POSTGRES_USER=kitchorify \
  -e POSTGRES_PASSWORD=change-me \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2) Core API (services/api)

```bash
cd services/api
npm install

# Prisma client üret
npm run prisma:generate

# İlk kurulum / migration’ları uygula
npx prisma migrate dev

# API’yi başlat
DATABASE_URL='postgresql://kitchorify:change-me@localhost:5432/kitchorify' \
CORS_ORIGINS='http://localhost:3000' \
TURNSTILE_ENABLED='false' \
NODE_ENV=development \
npm run dev
```

- API health:
  - `http://localhost:4000/health`
  - `http://localhost:4000/health/db`

### 3) Frontend’i gerçek API’ye bağlama

Frontend env örneği (`.env.local`):

```bash
VITE_API_BASE_URL=http://localhost:4000/api

# (Opsiyonel) İnsan doğrulama (Cloudflare Turnstile)
# VITE_TURNSTILE_SITE_KEY=0x4AAAAAA...
```

## İnsan doğrulama (Cloudflare Turnstile)

Login ve kayıt ekranlarında insan doğrulaması için Turnstile desteği vardır.

- Frontend: `VITE_TURNSTILE_SITE_KEY` set edilirse widget görünür ve token gönderilir.
- Backend: `TURNSTILE_ENABLED=true` ve `TURNSTILE_SECRET_KEY` set edilirse token doğrulaması zorunlu olur.

### Auth hata kodları (gerçek API)

Core API, auth endpoint’lerinde hata durumunda JSON olarak `{ "error": "..." }` döner.
Frontend tarafında `apiFetch()` bu kodu `ApiError.code` olarak taşır ve login/kayıt ekranları bu koda göre kullanıcıya mesaj gösterir.

Öne çıkan kodlar:

- `HUMAN_VERIFICATION_REQUIRED`: Turnstile token gönderilmedi.
- `HUMAN_VERIFICATION_FAILED`: Turnstile doğrulaması başarısız.
- `INVALID_CREDENTIALS`: Giriş bilgileri hatalı.
- `ALREADY_EXISTS`: Kayıtta tenant slug veya e-posta zaten kullanımda.

Not: Login/kayıt başarısız olursa Turnstile widget resetlenir.

Sonra:

```bash
npm run dev
```

Notlar:

- `VITE_API_BASE_URL=/api` daha çok **prod’da** (Caddy aynı origin proxy) için uygundur.
- Lokal dev’de proxy kurulmadığı için genelde `http://localhost:4000/api` gibi absolute URL kullanmak daha basittir.

## Mock veriyi sıfırlama

Mock modda veriler tarayıcı `localStorage`’dadır. Detaylı anahtar listesi için kök README’ye bakın.

## Sık karşılaşılan problemler

- **401 UNAUTHENTICATED:** API modu açıkken geçerli session yoktur; tekrar login olun.
- **CORS hatası:** API’de `CORS_ORIGINS` içine `http://localhost:3000` ekleyin.
