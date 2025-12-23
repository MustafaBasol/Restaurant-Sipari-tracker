# VPS Kurulum (Docker Compose + Caddy)

Bu klasör, Ubuntu 24.04 VPS üzerinde güvenli (TLS/HTTPS) şekilde çalıştırmak için örnek bir kurulum sağlar.

## Mimari

- `caddy` (edge): 80/443 dinler, TLS sertifikasını otomatik alır ve `/stripe/*` isteklerini iç servislerine proxy’ler.
- `web`: Vite build çıktısını statik olarak servis eder.
- `stripe-backend`: `server.cjs` (Stripe demo backend)
- `print-server`: `printer-server.cjs` (opsiyonel, varsayılan kapalı)

Önerilen yaklaşım: frontend servis URL’lerini **same-origin path** olarak ayarlamak:

- `VITE_STRIPE_BACKEND_URL=https://<domain>/stripe`

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
- `VITE_STRIPE_BACKEND_URL=https://<domain>/stripe`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`

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

## 5) Kontrol

- Sağlık: `https://<domain>/health`
- Frontend: `https://<domain>/#/`

## 6) Firewall önerisi

VPS firewall’ında minimum:

- 22/tcp (SSH)
- 80/tcp (HTTP → HTTPS redirect / ACME)
- 443/tcp (HTTPS)

Backend servis portlarını (4242/4243) **dışarı açmayın** (compose içinde zaten expose).

## Notlar

- Vite env’leri build sırasında bundle’a gömülür. Env değişirse web imajını yeniden build etmeniz gerekir.
- Stripe webhook kullanacaksanız `STRIPE_WEBHOOK_SECRET` set edin ve webhook URL’nizi `https://<domain>/stripe/stripe-webhook` olarak yapılandırın.
