<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Restaurant Sipariş Takip (Kitchorify / Restaurant OS)

Çok kiracılı (multi-tenant), çok dilli restoran sipariş yönetim uygulaması. Garson, mutfak ve admin rolleriyle; masa, menü ve sipariş akışını tek arayüzde yönetmeyi hedefler. Demo/POC amaçlı olarak backend yerine tarayıcı `localStorage` üzerinde çalışan mock API kullanır.

## Özellikler

- **Roller:** Super Admin, Admin, Garson (Waiter), Mutfak (Kitchen)
- **Masa yönetimi:** masa durumu (boş/dolu) ve sipariş akışı
- **Menü yönetimi:** kategori + ürün, ürün müsaitlik durumu
- **Sipariş akışı:** garson sipariş oluşturur/günceller, mutfak item statülerini ilerletir
- **Raporlama:** özet rapor ve “top items” (mock veriden)
- **Dil desteği:** EN/TR/FR (JSON çeviriler)
- **Abonelik/deneme süresi:** deneme bitince uygulama erişimi “subscription ended” ekranına yönlenir

## Teknoloji

- React 19 + TypeScript
- Vite
- UI: TailwindCSS (CDN üzerinden, `index.html` içinde tema tanımı)
- Ödeme: Stripe Elements (demo entegrasyonu, ödeme onayı mock)

## Hızlı Başlangıç

**Gereksinimler:** Node.js (öneri: 18+), npm

1) Bağımlılıkları kur:

```bash
npm install
```

2) Geliştirme sunucusunu başlat:

```bash
npm run dev
```

3) Tarayıcıdan aç:

- http://localhost:3000

## Komutlar

```bash
# Dev
npm run dev

# Prod build
npm run build

# Build çıktısını yerelde preview
npm run preview
```

## Demo Hesapları

Uygulama ilk açılışta mock verilerle gelir.

| Rol | Email | Şifre / Tenant Slug |
|---|---|---|
| Super Admin | `superadmin@kitchorify.com` | `superadmin` |
| Admin | `admin@sunsetbistro.com` | `sunset-bistro` |
| Garson | `waiter@sunsetbistro.com` | `sunset-bistro` |
| Mutfak | `kitchen@sunsetbistro.com` | `sunset-bistro` |

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
- Oturum anahtarı: `authState`

Veriyi sıfırlamak için tarayıcıda bu anahtarları silin (veya “Site Data/Clear Storage” ile temizleyin), ardından sayfayı yenileyin.

## Abonelik / Stripe Notları

- Stripe publishable key, ortam değişkeninden okunur: `VITE_STRIPE_PUBLISHABLE_KEY`.
- Lokal geliştirmede örnek olarak `.env.local` içine ekleyebilirsiniz:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
- Ödeme onayı **mock** çalışır: ödeme başarılı varsayılır ve mock “webhook” simülasyonu ile tenant aboneliği ACTIVE’e çekilir.
- Klasörde ayrıca örnek bir webhook sunucusu vardır: `server.js`.
  - Bu dosya, mevcut `package.json` scriptlerine bağlı değildir.
  - Çalıştırmak isterseniz `express/stripe/dotenv/cors` gibi bağımlılıkları ayrıca kurmanız gerekir (detaylar dosya içinde yorum olarak var).

## Proje Yapısı (Özet)

- `app/` uygulama giriş ve router/provider katmanı
- `features/` domain bazlı modüller (auth, orders, tables, menu, users, subscription, reports, vb.)
- `shared/` ortak UI bileşenleri, i18n, tipler ve mock API
- `locales/` çeviri JSON dosyaları

## Notlar

- Repoda eski/alternatif bir akışa ait dosyalar da bulunabilir (ör. kökteki `App.tsx`, `services/api.ts`, `contexts/AppContext.tsx`). Uygulama giriş noktası `index.tsx` üzerinden `app/App.tsx`’i kullanır.

## Geliştirme / İyileştirme Takibi

- Teknik borç ve ilerleme: `docs/IMPROVEMENTS.md`
