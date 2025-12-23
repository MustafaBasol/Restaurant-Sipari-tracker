# Operasyon Runbook (Prod)

Bu doküman “veri kaybı kabul edilemez” hedefiyle prod işletimi için pratik runbook’tur.

Detaylı VPS kurulum adımları: [deploy/README.md](../deploy/README.md)

## 1) Sağlık kontrolleri

- Edge (Caddy): `GET https://<domain>/health` → `ok`
- API liveness: `GET https://<domain>/api/health` → `ok`
- API + DB readiness: `GET https://<domain>/api/health/db` → `ok` (DB yoksa 503)

## 2) Backup stratejisi (katmanlı)

### Katman A — VPS üzerinde günlük yedek (pg-backup)

- `pg-backup` container’ı günlük yedek üretir ve `deploy/backups/` altına yazar.
- Retention env’leri `deploy/.env.production.example` içinde.

Önemli: Bu tek başına **disk kaybına karşı korumaz**.

### Katman B — Off-host sync (rclone + systemd)

- `deploy/backup-sync.sh` + `deploy/systemd/kitchorify-backup-sync.*`
- Amaç: `deploy/backups/` klasörünü remote hedefe (S3/SSH/B2 vs) mirror etmek.

## 3) Restore drill (haftalık önerilir)

- `deploy/restore-drill.sh` prod DB’ye dokunmadan yedeği yeni bir test DB’ye restore eder.
- Systemd timer örneği: `deploy/systemd/kitchorify-restore-drill.*`

Bu test iki şeyi kanıtlar:

- Yedek gerçekten restore edilebiliyor.
- RTO (geri dönüş süresi) ölçülebiliyor.

## 4) Failure alert (email)

- Backup sync veya restore drill başarısız olursa systemd `OnFailure` ile email atılır.
- Kurulum bileşenleri:
  - `deploy/notify-email.sh`
  - `deploy/systemd/kitchorify-email-alert@.service`
  - `deploy/email-alert.env.example`

## 5) Loglar

- systemd logları:
  - `journalctl -u kitchorify-backup-sync.service -n 200 --no-pager`
  - `journalctl -u kitchorify-restore-drill.service -n 200 --no-pager`
- Docker container logları compose’da rotation ile sınırlandırılmıştır (`max-size/max-file`).

## 6) En kritik prod dosyaları

- Deploy stack: [deploy/docker-compose.yml](../deploy/docker-compose.yml)
- Reverse proxy: [deploy/Caddyfile](../deploy/Caddyfile)
- Prod env örneği: [deploy/.env.production.example](../deploy/.env.production.example)
- Dokümanlar:
  - [docs/PRODUCTION.md](PRODUCTION.md)
  - [docs/SECURITY.md](SECURITY.md)
