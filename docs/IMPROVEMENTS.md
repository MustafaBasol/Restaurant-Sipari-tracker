# İyileştirme Takibi (Güvenlik • Doğruluk • Performans • UI)

Bu doküman, repodaki eksikleri/yanlışları tespit edip düzeltirken ilerlemeyi takip etmek için tutulur.

> Not: Bu repo şu an demo/POC yaklaşımıyla (mock backend + localStorage) çalışıyor. Aşağıdaki maddeler “prod-ready” olmak için gerekenleri de kapsar, ancak ilk hedef **stabil ve hızlı** bir dev deneyimi.

## Durum Legend

- ✅ Tamamlandı
- 🟡 Devam ediyor
- ⏳ Bekliyor

---

## P0 — Doğruluk / Çökme Riski / Yanlış Davranış

1) ✅ Router’da render sırasında redirect (side‑effect)
- Problem: `app/Router.tsx` içinde bazı koşullarda render sırasında `window.location.hash = ...` çalışıyordu. Bu React’te side‑effect’tir; re-render döngüleri ve yarış bug’larına yol açabilir.
- Çözüm: Redirect kararını state’e yazıp, gerçek navigasyonu `useEffect` içinde yaptık; render saf (pure) kaldı.

2) ✅ Tek mimari seçimi (legacy kodların temizlenmesi)
- Problem: `app/` + `features/` + `shared/` mimarisi yanında `contexts/`, `services/`, `screens/`, `components/` gibi eski akış da repoda duruyor.
- Risk: Yanlış import, tutarsız localStorage anahtarları, bakım maliyeti.
- Çözüm: Entry point tarafından kullanılmayan legacy klasörler ve dosyalar kaldırıldı (eski `App.tsx`, `contexts/`, `services/`, `screens/`, `components/`, `hooks/`, `locales/translations.ts`, `types.ts`).

3) ✅ Stripe publishable key yönetimi
- Problem: `CheckoutPage` publishable key’i placeholder/hardcode idi.
- Çözüm: `VITE_STRIPE_PUBLISHABLE_KEY` üzerinden okunuyor; eksikse sayfada net hata gösteriliyor.

---

## P1 — Güvenlik / Prod’a Yakınlaştırma

- ⏳ Mock auth ve şifre saklama yaklaşımını izole et (prod modunda localStorage’a hassas veri yazma).
- ⏳ `server.js` örnek webhook sunucusunu ESM/CJS uyumlu hale getir ve CORS’u kısıtla (örnek bile olsa yanlış yönlendirmesin).

---

## P2 — Performans

- ⏳ Mutasyon sonrası full refetch desenlerini azalt (Order/Table context). En azından gereksiz refetch’leri buda.
- ⏳ i18n çeviri yüklemeyi cache’le / prefetch et.

---

## P3 — Modern UI / Engineering Hijyeni

- ⏳ Tailwind’i CDN yerine build-time’a taşı (tailwindcss + postcss). (Büyük değişiklik; P0/P1 sonrası.)
- ⏳ ESLint + Prettier + typecheck script’i ekle ve CI’ya bağla.
