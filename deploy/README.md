# VPS Kurulum (Docker Compose + Caddy)

Bu klasör, Ubuntu 24.04 VPS üzerinde güvenli (TLS/HTTPS) şekilde çalıştırmak için örnek bir kurulum sağlar.

## Mimari

- `caddy` (edge): 80/443 dinler, TLS sertifikasını otomatik alır ve `/stripe/*` isteklerini iç servislerine proxy’ler.
- `web`: Vite build çıktısını statik olarak servis eder.
- `stripe-backend`: `server.cjs` (Stripe demo backend)
- `api`: `services/api` (Postgres + Prisma + Express) – core uygulama API’si
- `postgres`: kalıcı veritabanı
- `pg-backup`: Postgres günlük yedek (gzip) + retention
- `print-server`: `printer-server.cjs` (opsiyonel, varsayılan kapalı)

Önerilen yaklaşım: frontend servis URL’lerini **same-origin path** olarak ayarlamak:

- `VITE_STRIPE_BACKEND_URL=https://<domain>/stripe`
- `VITE_API_BASE_URL=/api`

Print Server için:

- Önerilen: Print Server’ı restoran LAN/VPN içinde çalıştırın.
- VPS üzerinde varsayılan olarak **public route yoktur** (internet üzerinden erişmez).

Bu sayede frontend’deki origin allowlist varsayılanı (prod’da same-origin) ile uyumlu olur.

## 0) Gerekli bilgiler

Aşağıdakileri bilmeniz gerekiyor:

- Domain: `app.example.com`
- Domain: `kitchorify.com`
- TLS için e-posta: `admin@example.com`
- Stripe secret key + price id
- Postgres için güçlü şifre

## 1) VPS hazırlığı (Ubuntu 24.04)

```bash
sudo apt update
sudo apt install -y ca-certificates curl

# Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
# yeniden login gerekli olabilir
```

## 2) Repo’yu klonla

```bash
git clone https://github.com/MustafaBasol/Restaurant-Sipari-tracker.git
cd Restaurant-Sipari-tracker/deploy
```

## 3) Prod env dosyası oluştur

```bash
cp .env.production.example .env.production
nano .env.production
```

Önemli alanlar:

- `DOMAIN`, `ACME_EMAIL`, `CORS_ORIGINS`
- `VITE_API_BASE_URL=/api`
- `VITE_STRIPE_BACKEND_URL=https://<domain>/stripe`
- (opsiyonel) `VITE_TURNSTILE_SITE_KEY=...` (login/register bot koruması için)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`
- `APP_PUBLIC_URL=https://<domain>` (email linkleri için zorunlu)
- `MAILERSEND_API_KEY`, `MAILERSEND_SENDER_EMAIL`, `MAILERSEND_SENDER_NAME`
- (opsiyonel) `TURNSTILE_ENABLED=true|false`, `TURNSTILE_SECRET_KEY=...`
- (opsiyonel) `MFA_ISSUER=Kitchorify`
- `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_USER`, `DATABASE_URL`

Yedekleme (önerilir):

- `PG_BACKUP_SCHEDULE=@daily`
- `PG_BACKUP_KEEP_DAYS=14`

Opsiyonel güvenlik:

- `STRIPE_API_KEY` set ederseniz Caddy bu anahtarı upstream’e enjekte eder.
  - Böylece browser tarafına secret gitmeden endpoint’ler korunur.

## Print Server (opsiyonel)

Print Server’ın internetten erişilebilir olmasına gerek yoksa (önerilen):

- Print Server’ı restoran içindeki bir cihazda/LAN’da çalıştırın.
- Gerekirse cihazlarda `VITE_PRINT_SERVER_URL` tenant ayarı ile LAN URL’sine yönlendirin.

Eğer VPS üzerinde **bilinçli olarak** çalıştırmak isterseniz:

1. Compose ile `print` profilini açın:

```bash
docker compose --env-file .env.production --profile print up -d --build
```

2. Reverse proxy ile `/print/*` route’unu açmanız gerekir (bu repo içindeki [deploy/Caddyfile](deploy/Caddyfile) içinde varsayılan kapalıdır).

3. Frontend’e `VITE_PRINT_SERVER_URL=https://<domain>/print` verin.

## 4) Çalıştır

```bash
docker compose --env-file .env.production up -d --build
```

Not: Compose dosyasında (json-file driver) container log’ları için temel bir rotation ayarı vardır (diskin log ile dolma riskini azaltmak için). İsterseniz `deploy/docker-compose.yml` içindeki `max-size/max-file` değerlerini kendi ihtiyacınıza göre ayarlayın.

## 5) Kontrol

- Sağlık: `https://<domain>/health`
- API sağlık: `https://<domain>/api/health`
- API + DB sağlık: `https://<domain>/api/health/db` (DB bağlıysa `ok`; değilse 503)
- Frontend: `https://<domain>/#/`

## 6) Yedekleme (kritik)

`pg-backup` servisi yedekleri VPS üzerinde `deploy/backups/` içine yazar.

- Bu klasör **repo’ya commit edilmez**.
- “Veri kaybı kabul edilemez” için `deploy/backups/` klasörünü **off-host** senkronlayın (S3/rsync) ve düzenli restore testi yapın.

### Off-host senkron (otomatik) – rclone + systemd (önerilen)

Repo içinde örnek dosyalar:

- [deploy/backup-sync.sh](deploy/backup-sync.sh)
- [deploy/backup-sync.env.example](deploy/backup-sync.env.example)
- [deploy/systemd/kitchorify-backup-sync.service](deploy/systemd/kitchorify-backup-sync.service)
- [deploy/systemd/kitchorify-backup-sync.timer](deploy/systemd/kitchorify-backup-sync.timer)

Kurulum adımları (VPS):

1. Rclone config oluşturun (Docker ile):

```bash
sudo mkdir -p /etc/kitchorify
sudo docker run --rm -it -v /etc/kitchorify:/config rclone/rclone config
sudo mv /etc/kitchorify/rclone.conf /etc/kitchorify/rclone.conf 2>/dev/null || true
```

Not: `rclone config` bitince config dosyası `/etc/kitchorify/rclone.conf` altında olmalı.

2. Env dosyasını oluşturun:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo cp backup-sync.env.example /etc/kitchorify/backup-sync.env
sudo nano /etc/kitchorify/backup-sync.env
```

3. Sync script’ini kurun:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo install -m 0755 backup-sync.sh /usr/local/bin/kitchorify-backup-sync
```

4. systemd timer’ı etkinleştirin:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo cp systemd/kitchorify-backup-sync.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kitchorify-backup-sync.timer

# durum
systemctl status kitchorify-backup-sync.timer --no-pager
```

5. Manuel çalıştırma / log:

```bash
sudo systemctl start kitchorify-backup-sync.service
journalctl -u kitchorify-backup-sync.service -n 200 --no-pager
```

Bu yaklaşım `rclone sync` ile remote’u lokaldeki retention set’iyle aynı tutar.

### Restore drill (prod DB’ye dokunmadan test)

Yedeklerin gerçekten işe yaradığını düzenli olarak doğrulamak için, yedeği yeni bir test DB’ye restore eden bir DR testi çalıştırın:

- Script: [deploy/restore-drill.sh](deploy/restore-drill.sh)

Örnek (VPS):

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo install -m 0755 restore-drill.sh /usr/local/bin/kitchorify-restore-drill

sudo /usr/local/bin/kitchorify-restore-drill --env-file /opt/Restaurant-Sipari-tracker/deploy/.env.production \
  --backup /opt/Restaurant-Sipari-tracker/deploy/backups/<yedek-dosyasi>
```

Bu test, prod DB’yi değiştirmez; restore süresini ve temel veri bütünlüğünü ölçmenizi sağlar.

### Restore drill (otomatik/haftalık) – systemd timer

Haftalık olarak en yeni yedeği seçip restore drill çalıştırmak için:

1. Script’i kurun:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo install -m 0755 restore-drill.sh /usr/local/bin/kitchorify-restore-drill
```

2. Env dosyasını oluşturun:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo cp restore-drill.env.example /etc/kitchorify/restore-drill.env
sudo nano /etc/kitchorify/restore-drill.env
```

3. systemd unit + timer’ı etkinleştirin:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo cp systemd/kitchorify-restore-drill.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kitchorify-restore-drill.timer

systemctl status kitchorify-restore-drill.timer --no-pager
```

Log görmek için:

```bash
journalctl -u kitchorify-restore-drill.service -n 200 --no-pager
```

### Email uyarı (backup sync / restore drill başarısız olursa)

`kitchorify-restore-drill.service` veya `kitchorify-backup-sync.service` başarısız olursa systemd otomatik olarak bir email uyarı servisi tetikler.

Kurulum (VPS):

1. `msmtp` kurun:

```bash
sudo apt update
sudo apt install -y msmtp msmtp-mta
```

2. Email env dosyasını oluşturun:

```bash
sudo mkdir -p /etc/kitchorify
cd /opt/Restaurant-Sipari-tracker/deploy
sudo cp email-alert.env.example /etc/kitchorify/email-alert.env
sudo nano /etc/kitchorify/email-alert.env
```

3. Notify script + systemd unit’i kurun:

```bash
cd /opt/Restaurant-Sipari-tracker/deploy
sudo install -m 0755 notify-email.sh /usr/local/bin/kitchorify-notify-email
sudo cp systemd/kitchorify-email-alert@.service /etc/systemd/system/
sudo systemctl daemon-reload
```

Test etmek için (manuel):

```bash
sudo /usr/local/bin/kitchorify-notify-email kitchorify-restore-drill.service
sudo /usr/local/bin/kitchorify-notify-email kitchorify-backup-sync.service
```

## 7) Firewall önerisi

VPS firewall’ında minimum:

- 22/tcp (SSH)
- 80/tcp (HTTP → HTTPS redirect / ACME)
- 443/tcp (HTTPS)

Backend servis portlarını (4242/4243) **dışarı açmayın** (compose içinde zaten expose).

## Notlar

- Vite env’leri build sırasında bundle’a gömülür. Env değişirse web imajını yeniden build etmeniz gerekir.
- Stripe webhook kullanacaksanız `STRIPE_WEBHOOK_SECRET` set edin ve webhook URL’nizi `https://<domain>/stripe/stripe-webhook` olarak yapılandırın.
