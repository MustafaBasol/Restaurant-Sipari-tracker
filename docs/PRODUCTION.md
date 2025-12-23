# Production Hazırlık (Go‑Live) – Kitchorify

Bu doküman, bu repoda yapılan **prod hardening + VPS deploy** çalışmalarını tek yerde özetler ve “şu an prod için hazır mıyız?” sorusuna **kapsamı netleştirerek** yanıt verir.

Bu repo artık iki modda çalışabilir:

- **Mock/Demo mod:** `VITE_API_BASE_URL` tanımlı değilse frontend `localStorage` tabanlı mock API ile çalışır.
- **Gerçek prod mod:** `VITE_API_BASE_URL=/api` ve `DATABASE_URL` ile **Postgres + Prisma + Express (services/api)** üzerinden çalışır.

## 1) Kapsam (Neyi prod’a alıyoruz?)

**Bu repo ile “gerçek production” için hedeflenen akış:**

- Vite ile build edilen frontend’in HTTPS ile yayınlanması
- Core API’nin aynı origin altında `/api/*` ile yayınlanması
- Postgres üzerinde kalıcı veri + Prisma migration’larının otomatik uygulanması (`prisma migrate deploy`)
- Stripe demo backend’in aynı origin altında `/stripe/*` ile yayınlanması (abonelik/checkout akışı için)
- Print Server’ın **public internete açılmaması** (varsayılan)

**Halen ops/kurumsal production için tipik eksikler (sizin standartlarınıza göre):**

- Off-host yedekleme (S3/rsync) ve düzenli restore testi
- İzleme/alerting (uptime, disk doluluğu, DB bağlantı havuzu, hata oranı)
- Secrets yönetimi/rotasyon (SSM/Vault) ve erişim kontrolleri

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
  - Frontend → `https://<domain>/api` → core API

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
  - `VITE_API_BASE_URL=/api`
  - `POSTGRES_PASSWORD=...` (uzun/rasgele)
  - `DATABASE_URL=postgresql://...@postgres:5432/...`
  - `VITE_STRIPE_BACKEND_URL=https://kitchorify.com/stripe`
  - `STRIPE_SECRET_KEY=...`
  - `STRIPE_PRICE_ID_MONTHLY=...`
  - (önerilir) `STRIPE_WEBHOOK_SECRET=...`
  - (opsiyonel) `STRIPE_API_KEY=...` (Caddy upstream’e header enjekte eder)

  Yedekleme için (varsayılanlar önerilir):
  - `PG_BACKUP_SCHEDULE=@daily`
  - `PG_BACKUP_KEEP_DAYS=14`

4. Çalıştırma

- `deploy/README.md` içindeki komutlarla:
  - `docker compose --env-file .env.production up -d --build`

5. Sağlık kontrol

- `https://kitchorify.com/health` → `ok`
- `https://kitchorify.com/api/health` → `ok`
- `https://kitchorify.com/api/health/db` → `ok` (DB bağlıysa; değilse 503)
- `https://kitchorify.com/#/` → UI açılır

## 4) Postgres yedekleme ve geri yükleme (kritik)

Bu repo deploy’unda `pg-backup` servisi **günlük gzip’li** yedek üretir ve `deploy/backups/` içine yazar.

Önemli notlar:

- Bu yaklaşım **mantıksal yedek** (`pg_dump`) seviyesindedir.
- Aynı VPS diski kaybolursa bu klasör de kaybolur. “Veri kaybı kabul edilemez” için `deploy/backups/` klasörünü **off-host** (S3/rsync) senkronlamanız ve **restore testini** düzenli yapmanız gerekir.

### Off-host senkron (otomatik) – rclone + systemd

Deploy içinde örnek bir kurulum mevcut:

- [deploy/backup-sync.sh](deploy/backup-sync.sh)
- [deploy/backup-sync.env.example](deploy/backup-sync.env.example)
- [deploy/systemd/kitchorify-backup-sync.service](deploy/systemd/kitchorify-backup-sync.service)
- [deploy/systemd/kitchorify-backup-sync.timer](deploy/systemd/kitchorify-backup-sync.timer)

Bu kurulum, `deploy/backups/` klasörünü günlük olarak off-host bir hedefe (S3/SSH/Backblaze vb. rclone remote) **mirror** eder.

### Remote’dan geri alma (örnek)

Örnek: Remote’daki yedekleri VPS’e geri kopyala:

```bash
sudo mkdir -p /tmp/kitchorify-backups-restore

# /etc/kitchorify/backup-sync.env içindeki aynı remote/dest ile
set -a
source /etc/kitchorify/backup-sync.env
set +a

sudo docker run --rm \
  -v /tmp/kitchorify-backups-restore:/restore \
  -v /etc/kitchorify/rclone.conf:/config/rclone/rclone.conf:ro \
  -e RCLONE_CONFIG=/config/rclone/rclone.conf \
  rclone/rclone copy "$RCLONE_REMOTE:$RCLONE_DEST" /restore
```

### Manuel yedek (tek sefer)

```bash
cd deploy
docker compose --env-file .env.production exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom \
  > backups/manual-$(date +%F-%H%M).dump
```

### Manuel restore (custom format)

Uyarı: Bu işlem hedef DB’yi overwrite edebilir.

```bash
cd deploy

# (önerilir) önce app'i durdur
docker compose --env-file .env.production stop api

# restore
cat backups/<dosya>.dump | docker compose --env-file .env.production exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists

# tekrar başlat
docker compose --env-file .env.production start api
```

### Restore drill (önerilen rutin)

Amaç: Yedeklerin gerçekten restore edilebildiğini düzenli olarak kanıtlamak ve RTO’yu (geri dönüş süresi) ölçmek.

Öneri: Prod DB’yi etkilemeden, yedeği **yeni bir test DB’ye** restore edin.

Repo içinde bunun için bir script var: [deploy/restore-drill.sh](deploy/restore-drill.sh)

Not: Bu restore drill’i haftalık otomatik koşturmak için systemd timer örneği de mevcut. Kurulum adımları için [deploy/README.md](deploy/README.md) içinde “Restore drill (otomatik/haftalık)” bölümüne bakın.

Örnek kullanım (VPS):

```bash
cd /opt/Restaurant-Sipari-tracker/deploy

# script'i kur
sudo install -m 0755 restore-drill.sh /usr/local/bin/kitchorify-restore-drill

# en yeni yedeği seç (örnek: sql.gz veya dump)
ls -1t backups | head

# DR test restore (yeni test DB oluşturur)
sudo /usr/local/bin/kitchorify-restore-drill --env-file /opt/Restaurant-Sipari-tracker/deploy/.env.production \
  --backup /opt/Restaurant-Sipari-tracker/deploy/backups/<yedek-dosyasi>
```

Beklenen çıktı:

- Oluşturulan test DB adı (timestamp’li)
- Restore süresi (saniye)
- Basit sayım sorguları (Tenant/User/Order)

Bu test DB’yi işiniz bittiğinde düşürün (script sonunda komut örneği basılır).

## 5) Print Server stratejisi (prod önerisi)

- Varsayılan olarak **public değil**; Caddy’de `/print` route yoktur.
- En güvenlisi: Print Server’ı restoran LAN/VPN içinde çalıştırmak.
- VPS üzerinde açmanız gerekiyorsa:
  - Compose’da `--profile print`
  - Caddy’de ayrıca `/print/*` route’unu bilinçli şekilde açmanız gerekir
  - Mutlaka `API_KEY` + dar `CORS_ORIGINS` kullanın

## 6) “Şu an prod için hazır mıyız?” (dürüst değerlendirme)

**Evet, şu koşullarda “prod’a çıkılabilir” durumdasınız:**

- Hedefiniz, frontend’i HTTPS ile yayınlamak ve Stripe demo backend’i same-origin `/stripe` altında çalıştırmaksa
- `CORS_ORIGINS` sadece gerçek domain’leri içeriyorsa
- `STRIPE_WEBHOOK_SECRET` set edildiyse (webhook kullanıyorsanız)
- Backend portları public internete açılmadıysa
- (tercihen) API anahtarı koruması etkinleştirildiyse (`API_KEY` / `STRIPE_API_KEY`)

**Ama “veri kaybı kabul edilemez” standardı için halen kritik ops işleri var:**

- `deploy/backups/` klasörünün **off-host** senkronu (S3/rsync) ve düzenli restore testi
- Disk doluluğu, container restart, 5xx oranı gibi metriklere alert (en azından uptime + disk alarmı)
- DB erişim/secret yönetimi (en azından güçlü şifreler + erişim sınırı)

Özet karar:

- **Marketing + demo uygulama yayını için:** büyük ölçüde hazır.
- **Gerçek restoran operasyonu (kalıcı sipariş DB, muhasebe, SLA) için:** gerçek backend/DB katmanı eklenmeden “tam prod” saymayın.

## 7) Go‑Live checklist (kısa)

- [ ] DNS A kaydı doğru
- [ ] Firewall yalnızca 22/80/443 açık
- [ ] `deploy/.env.production` dolduruldu (secret’lar repoda değil)
- [ ] `CORS_ORIGINS=https://kitchorify.com` (minimum)
- [ ] `VITE_STRIPE_BACKEND_URL=https://kitchorify.com/stripe`
- [ ] Webhook kullanılıyorsa `STRIPE_WEBHOOK_SECRET` set
- [ ] Opsiyonel: API key koruması etkin (`API_KEY` ve/veya `STRIPE_API_KEY`)
- [ ] `https://kitchorify.com/health` OK
- [ ] `https://kitchorify.com/api/health` OK
- [ ] Print Server public değil (varsayılan)
- [ ] `deploy/backups/` off-host senkronlandı (S3/rsync)
- [ ] Restore testi yapıldı ve süre ölçüldü
