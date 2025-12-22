# Restoran Sahibi Gözüyle İnceleme (İhtiyaçlar + İstek Listesi)

Bu doküman, uygulamayı bir restoran sahibi gibi değerlendirip **gerçek bir restoranda kullanmak için** hangi özellikleri bekleyeceğimi ve bunları **önceliklendirerek** nasıl planlayacağımı anlatır.

> Kapsam notu: Repo şu an demo/POC yaklaşımı (mock backend + localStorage) ile çalışıyor. Aşağıdaki maddeler “prod-ready” gereksinimleri ve işletme gerçekleriyle uyumlu olacak şekilde yazıldı.

---

## 1) Bugün uygulama ile yapılabilenler (gözlenen)

**Roller ve ana ekranlar**

- **Garson (WAITER)**: Masaları görme, masa durumunu değiştirme (boş/dolu), masa seçip sipariş modalı ile ürün ekleme, not girme, mutfağa gönderme, servis/iptal akışları, masa kapatma.
- **Mutfak (KITCHEN)**: Aktif siparişleri listeleme, sipariş kalemi durumunu ilerletme (NEW → IN_PREPARATION → READY), bildirim modalı.
- **Admin (ADMIN)**: Masa yönetimi, menü & kategori yönetimi, kullanıcı yönetimi, sipariş geçmişi, temel rapor (günlük özet), temel ayarlar (timezone/currency/default language), abonelik durumu/aktivasyon.
- **Super Admin**: Tenant listesi, tenant bazlı yönetim (demo).

**Kritik güçlü yanlar (işletme açısından değerli)**

- Masa→sipariş→mutfak akışı uçtan uca var.
- Çoklu rol ayrımı mevcut.
- Çoklu dil / para birimi / timezone temeli var.
- Abonelik konsepti (trial/active) uygulama erişimine bağlı.

---

## 2) Gerçek restoranda “olmazsa olmaz” (MVP) eksikler

Aşağıdakiler olmadan, gerçek işletmede uygulama günlük operasyonu tek başına taşıyamaz.

### 2.1 Ödeme & hesap kapatma

- **Adisyon/hesap akışı**: Masa kapatmadan önce “hesabı al” / “ödeme alındı” adımı; kapatma yetkisi/rol kontrolü.
- **Ödeme türleri**: Nakit / kredi kartı / yemek kartı / karma ödeme.
- **Split bill**: Kişi bazlı bölme, kalem bazlı bölme, kısmi ödeme.
- **İndirim & ikram**: Yüzde/tutar indirim, ikram kalemi, kupon/QR.
- **Vergi/KDV/servis**: KDV oranları, servis bedeli, yuvarlama kuralları.

Kabul kriteri örneği:

- “Masa kapat” sadece **tüm kalemler SERVED/CANCELED** değil, ayrıca **ödeme tamamlandı** durumuna bağlı olmalı.

### 2.2 Mutfak operasyon gerçekleri

- **Birden fazla istasyon**: Bar / sıcak / soğuk / tatlı gibi istasyon bazlı kuyruğa düşürme.
- **Hazırlama süresi & SLA**: Sipariş yaşı, geciken sipariş göstergesi.
- **Fiş yazdırma / KDS**: Mutfak için yazıcı çıktısı (en azından opsiyon) veya tam ekran KDS modu.
- **Stok/ürün uygunluğu**: “Tükendi” işareti mutfağa/garsona anında yansımak zorunda.

### 2.3 Menü modeli (ürün seçenekleri)

- **Modifer/opsiyon**: (Az pişmiş/orta, ekstra peynir, sos seçimi vb.)
- **Alerjen bilgisi** ve içerik notları.
- **Porsiyon/variant**: Küçük/orta/büyük gibi varyant fiyatları.
- **Kampanya/menü seti**: Menü setleri, paket ürün.

### 2.4 Masa yönetimi

- **Masa birleştir/böl**: 2 masayı tek adisyona bağlama.
- **Masa taşıma**: Siparişi başka masaya aktarma.
- **Masa rezervasyon/ön rezervasyon** (en azından basit).
- **QR ile müşteri oturum açma** (opsiyonel ama pratik): müşteri menüyü görüp garson çağırabilir.

### 2.5 Erişim, yetki, denetim

- **Yetkilendirme matrisi**: Garson neleri görebilir/değiştirebilir, admin neleri yapabilir?
- **Audit log**: Kim, neyi, ne zaman değiştirdi? (özellikle iptal/indirim/ödeme)
- **Cihaz yönetimi**: Aynı kullanıcıyla çoklu cihaz, oturum süresi, logout/kill session.

---

## 3) Yakın vade (Operasyonu büyüten) gereksinimler

### 3.1 Raporlar ve kârlılık

- Ürün bazlı satış, kategori bazlı satış, saatlik yoğunluk.
- Garson performansı (ciro, ortalama adisyon, iptal oranı).
- İptal/ikram/indirim raporu.
- Gün sonu (Z raporu benzeri) + kasa kapanış.

### 3.2 Entegrasyonlar

- POS/ödeme terminal entegrasyonu (ülkeye göre değişir).
- Yazıcı entegrasyonu (adisyon, mutfak fişi).
- Online sipariş platformları (opsiyonel; Türkiye’de Yemeksepeti/Getir gibi).

### 3.3 Operasyon dayanıklılığı

- **Offline/weak network modu**: bağlantı gelince senkron.
- Çakışma yönetimi: aynı masaya aynı anda iki cihazdan ekleme.
- Yedekleme/geri yükleme (tenant bazlı).

---

## 4) Sonra (Nice-to-have)

- Sadakat programı / müşteri profili (telefon, alerji notu, favoriler).
- Rezervasyon + bekleme listesi + SMS/WhatsApp bilgilendirme.
- Çok şube/çok lokasyon (branch) yönetimi.
- Personel vardiya/puantaj.
- Multi-currency fiyat listesi (turistik bölge).

---

## 5) Önerilen ürün yol haritası (pratik sıralama)

### P0 / MVP (işletmede çalıştırır)

1. Ödeme & adisyon: ödeme türleri + split bill + indirim/ikram + kapanış
2. Menü modelini güçlendir: modifier/variant + alerjen
3. Mutfak istasyonları + gecikme göstergesi
4. Yetki matrisi + audit log (iptal/indirim/ödeme)

### P1 (işi kolaylaştırır)

1. Masa taşıma + masa birleştir/böl
2. Gün sonu raporu + garson performansı
3. Yazıcı entegrasyonu (minimum: mutfak fişi)

### P2 (ölçek)

1. Offline mod + senkron/çatışma çözümü
2. Entegrasyonlar (POS, online sipariş)

---

## 5.1 Repo durum özeti (işaretleme)

Bu bölüm, yukarıdaki maddelerin **hangilerinin şu an repoda bulunduğunu** hızlıca işaretler.

### P0 / MVP durumu

**Ödeme & adisyon**

- [x] Ödeme türleri: Nakit / Kart / Yemek kartı (tek tek ödeme ekleme)
- [x] Kısmi ödeme + karma ödeme: aynı adisyona birden fazla ödeme satırı eklenebiliyor (payment lines)
- [x] İndirim: yüzde/tutar indirim mevcut
- [x] İkram: kalem bazlı ikram (complimentary) mevcut
- [x] Kapatma kuralı: adisyon kapatma **SERVED** + **ödeme PAID** şartına bağlı
- [x] “Hesabı al / ödeme alındı” gibi ayrı bir adım/durum akışı (UI state machine)
- [x] Split bill (kalem bazlı bölme + kısmi/karma ödeme)
  - Not: “Kalem Bazlı Bölme” ile seçilen kalemlerin tutarı hesaplanıp ödeme alanına doldurulabiliyor.
  - Not: kişi sayısı girip “kişi başı tutar” hesaplayan yardımcı alan da mevcut.
- [x] Vergi/KDV/servis bedeli/yuvarlama kuralları

**Menü modeli (ürün seçenekleri)**

- [x] Modifier/opsiyon: ürün opsiyonları + fiyat farkı
- [x] Porsiyon/variant: variant seçimi + variant fiyatı
- [x] Alerjen bilgisi: menüde gösterim
- [x] Kampanya/menü seti (bundle) modeli

**Mutfak operasyonu**

- [x] İstasyon (BAR/HOT/COLD/DESSERT) alanı + mutfakta istasyon filtresi
- [x] İstasyon bazlı “hazır” işaretleme (station parametreli akış)
- [x] Hazırlama süresi & SLA: sipariş yaşı/ geciken sipariş göstergesi
- [x] Fiş yazdırma (opsiyonel): tarayıcı yazdırma + opsiyonel print server desteği
- [x] Ürün uygunluğu (temel): menü öğesinde `isAvailable` alanı
- [x] “Tükendi” işaretinin garson/mutfak ekranına anlık ve operasyonel yansıması (bildirim + engelleme kuralları)

**Yetki / denetim**

- [x] Rol bazlı kısıtlar (ör. ödeme ekleme/indirim/kapatma gibi aksiyonlarda backend kontrolü)
- [x] Audit log yazımı (kısmi): sipariş oluşturma, kalem durum, not, ödeme, indirim, ikram, taşıma/birleştirme/ayırma, kapatma
- [x] Audit log ekranı (UI’dan görüntüleme/filtreleme)
- [x] Yetkilendirme matrisi (konfigüre edilebilir izinler)
- [x] Cihaz yönetimi / oturum sonlandırma

### P1 durumu

- [x] Masa taşıma + masa birleştir/ayır
- [x] Günlük özet rapor + garson performansı (temel)
- [x] Yazıcı entegrasyonu (minimum): mutfak fişi/adisyon çıktısı için browser veya print server

### P2 durumu

- [x] Offline mod + senkron/çatışma çözümü (demo)
- [x] Entegrasyonlar (POS, online sipariş) (demo)

---

## 6) Kısa kullanıcı hikayeleri (örnek)

- Garson: “Masa 12’de 4 kişi ayrı ödeyecek; 2 kişi kart, 2 kişi nakit. Üç kalem iptal, bir kalem ikram.”
- Mutfak: “Bar istasyonuna düşen içecekler ayrı ekranda, 7 dakikayı geçenler kırmızı.”
- Admin: “Bugün kaç TL indirim yapıldı, kim yaptı, hangi masalarda?”

---

## 7) Notlar / Riskler

- Gerçek kullanım için veri kaynağı localStorage yerine sunucu + gerçek zamanlı senkron (örn. WebSocket) gerekebilir.
- Ödeme/fiş entegrasyonları ülkeye/cihaza göre değişir; ürün stratejisinde hedef pazar netleşmeli.

---

## 8) Uygulanan geliştirmeler (repo notu)

Bu bölüm, yukarıdaki yol haritasındaki maddelerden **hangilerinin koda işlendiğini** ve **nasıl kullanıldığını** özetler.

### 8.1 P1 — Masa taşıma + masa birleştir/ayır

**Amaç**

- Garsonun, aktif bir adisyonu başka masaya **taşıyabilmesi**.
- 2+ masayı tek bir adisyona **bağlayabilmesi (birleştirme)** ve sonradan **ayırabilmesi**.

**Kullanım (Garson / WAITER)**

- Bir masaya girip sipariş oluşturduktan sonra, sipariş ekranında **“Masa İşlemleri”** alanı görünür.
  - **Taşı**: “Başka masaya taşı” dropdown’ından hedef masayı seçip “Taşı”ya bas.
  - **Birleştir**: “Masa birleştir” dropdown’ından eklenecek masayı seçip “Birleştir”e bas.
  - **Ayır**: Birleştirilen masalar varsa “Masayı ayır” dropdown’ından masayı seçip “Ayır”a bas.

**Kullanım (Admin / ADMIN)**

- Admin “Masa Yönetimi” ekranında “Siparişi Görüntüle” linki, birleştirilmiş (secondary) masalarda da doğru siparişi bulur.

**İş kuralları / kısıtlar**

- **Taşıma** yalnızca **birleştirilmemiş** (linkedTableIds olmayan) siparişlerde yapılır.
- Taşıma hedefi:
  - Masa mevcut olmalı.
  - Masa durumu **FREE** olmalı.
  - Hedef masada aktif sipariş olmamalı.
- **Birleştirme**:
  - Secondary masa mevcut olmalı.
  - Secondary masada aktif sipariş olmamalı.
  - Secondary masa, order’a `linkedTableIds` ile bağlanır ve masa durumu **OCCUPIED** olur.
- **Ayırma**:
  - Seçilen masa `linkedTableIds` listesinden çıkarılır.
  - Ayrılan masa durumu **FREE** olur.
- **Kapatma (close order)**:
  - Order kapatıldığında hem ana masa (`tableId`) hem de bağlı masalar (`linkedTableIds`) **FREE** yapılır.

**Görsel geri bildirim**

- Garson masalar grid’inde, bir sipariş birden fazla masaya bağlandıysa bağlı masalarda da “aktif sipariş” ikonu görünür.
- Birleştirilen secondary masaya tıklayıp sipariş ekranını açtığınızda aynı order açılır (order lookup `linkedTableIds`’ı da kapsar).

**Audit / denetim izi**

- Aşağıdaki aksiyonlar audit log’a yazılır:
  - `ORDER_MOVED`
  - `ORDER_TABLE_MERGED`
  - `ORDER_TABLE_UNMERGED`

**Teknik notlar (kısa)**

- Veri modeli: `Order.linkedTableIds?: string[]` (backward-compatible, opsiyonel).
- Mock backend (localStorage) tarafında taşıma/birleştirme/ayırma için özel mutation’lar eklendi.
- UI + lookup tarafında `tableId` eşleşmesine ek olarak `linkedTableIds.includes(tableId)` kontrolü yapılıyor.
- Repo doğrulama komutu: `npm run check` (format+lint+typecheck+build). `npm test` script’i tanımlı değil.

### 8.2 P2 — Offline mod + senkron/çatışma çözümü (demo)

**Amaç**

- Tarayıcı offline olduğunda da kullanıcı aksiyonlarını (sipariş, masa durumu vb.) çalıştırmak.
- Online olunca, offline iken biriken değişiklikleri **outbox** üzerinden otomatik **replay/senkron** etmek.
- Offline sürede “server” tarafında (başka tab/cihaz) değişiklik olduysa **çatışma ihtimalini** tespit edip basit bir politika ile ilerlemek.

**Uygulama (POC yaklaşımı)**

- Mock DB iki katmanlı çalışır:
  - **Server DB**: `kitchorify-db`
  - **Client cache (tab bazlı)**: `kitchorify-db-client:<deviceId>`
- Offline iken mutation’lar client cache’e uygulanır ve ayrıca `kitchorify-outbox:<deviceId>` kuyruğuna yazılır.
- Online olunca `flushOutbox()` çalışır ve outbox server DB’ye sırasıyla uygulanır.

**Çatışma tespiti / çözüm**

- Server DB’de kaba-granüler bir `mutationCounter` tutulur.
- Client cache, son bildiği server sayacını saklar.
- Online dönüşte sayaç değişmişse “server offline sürede değişti” olarak işaretlenir ve outbox **LWW (last-write-wins) replay** ile uygulanır.
- Bu durumlar `kitchorify-sync-conflicts:<deviceId>` listesine yazılır (demo amaçlı).

### 8.3 P0 — Adisyon akışı (Hesabı al → Ödeme alındı → Kapat)

**Amaç**

- Masayı kapatmadan önce işletme gerçeklerine uygun şekilde “hesabı al” ve “ödeme alındı” adımlarını ayrı bir durum akışı olarak yönetmek.

**Kullanım (Garson / ADMIN)**

- Sipariş ekranında **“Adisyon Akışı”** kutusunda:
  - **Hesabı Al**: adisyonu “hesap istendi” durumuna alır.
  - **Ödeme Alındı**: yalnızca ödeme toplamı adisyon toplamını karşıladığında aktifleşir; bu aksiyon sonrası “ödeme onaylandı” durumuna geçer.
- **Masayı Kapat** butonu, artık sadece:
  - tüm kalemler **SERVED/CANCELED** ve
  - ödeme matematiksel olarak **tam** ve
  - adisyon durumu **PAID (Ödeme onaylandı)**
    şartları sağlandığında aktif olur.

**Teknik not (demo)**

- `Order.billingStatus` ile kaba bir state machine eklendi: `OPEN` → `BILL_REQUESTED` → `PAID`.
- Aksiyonlar audit log’a yazılır: `ORDER_BILL_REQUESTED`, `ORDER_PAYMENT_CONFIRMED`.

### 8.4 P0 — Split bill (kalem bazlı bölme + kısmi/karma ödeme)

**Amaç**

- Aynı masada farklı kişilerin/ödeyicilerin, adisyonu **kalem bazında** paylaşıp ödeme alabilmesi.

**Kullanım (Garson / ADMIN)**

- Sipariş ekranında ödeme alanında:
  - **Kalem Bazlı Bölme**: her kalem için “adet” seçip seçilen toplamı gör.
  - **Seçilen Tutarı Doldur**: hesaplanan tutarı ödeme tutarı alanına otomatik yaz.
  - İstersen farklı ödeme yöntemleriyle birden fazla ödeme satırı ekleyerek **kısmi/karma ödeme** al.

**Teknik not (demo)**

- Bu adım, ödeme satırlarını kalemlere “kilitleyen” bir allocation modeli değil; hızlı ödeme alma için **hesaplama + doldurma** kolaylığı sağlar.

### 8.5 P0 — Vergi/KDV/servis bedeli/yuvarlama kuralları

**Amaç**

- Restoranın işletme gerçeklerine göre; indirim sonrası tutara **servis bedeli**, servis dahil tutara **KDV/Vergi** ekleyebilmesi.
- Toplamı belirli bir adımda **yuvarlama** (örn. 0.05) yapabilmesi.

**Kullanım (Admin / ADMIN)**

- Admin → Ayarlar ekranında **Fiyatlandırma** bölümünde:
  - **KDV/Vergi oranı (%)**
  - **Servis bedeli (%)**
  - **Yuvarlama adımı** (0 = kapalı; örnek: 0.05)
    değerlerini belirle.

**Kullanım (Garson / WAITER)**

- Sipariş ekranında toplam hesaplama artık şu sırayı izler:
  1. Ara toplam (ikram ve iptal hariç)
  2. İndirim
  3. Servis bedeli
  4. KDV/Vergi
  5. Yuvarlama
- Ödeme panelinde (varsa) servis/KDV/yuvarlama kırılımı gösterilir.
- Fiş/adisyon çıktısında servis/KDV/yuvarlama satırları (varsa) görünür.

**Teknik not (demo)**

- Tenant seviyesinde 3 yeni ayar kullanılır: `taxRatePercent`, `serviceChargePercent`, `roundingIncrement`.
- Hesaplama akışı `shared/lib/billing.ts` içindeki `calcOrderPricing()` ile tek noktada tutulur ve hem UI toplamlarında hem fiş çıktısında kullanılır.

### 8.6 P0 — Audit log ekranı (UI’dan görüntüleme/filtreleme)

**Amaç**

- Admin’in, yapılan kritik işlemleri (iptal/indirim/ödeme/taşıma/birleştirme/kapatma vb.) UI’dan görmesi ve hızlıca arayabilmesi.

**Kullanım (Admin / ADMIN)**

- Admin panelinde **Denetim Kaydı** sekmesine gir.
- Basit filtreler:
  - **Aksiyon** seçimi (tümü veya tek aksiyon)
  - **Arama** (kullanıcı adı/rol, aksiyon, entity, id ve metadata içinde)

**Teknik not (demo)**

- Audit log kayıtları mock DB’de `auditLogs` tablosuna yazılır.
- Ekran, tenant bazlı `getDataByTenant('auditLogs', tenantId)` ile listeyi çeker.

### 8.7 P0 — Yetkilendirme matrisi (konfigüre edilebilir izinler)

**Amaç**

- Rol bazlı sabit kontroller yerine, her tenant’ın (restoranın) **Garson/Mutfak** rollerine hangi aksiyonların açık olacağını yönetebilmesi.

**Kullanım (Admin / ADMIN)**

- Admin → **Ayarlar** ekranında **Yetkiler** bölümüne gir.
- İzin matrisinden (Garson / Mutfak sütunları) ilgili checkbox’ları aç/kapat.

**Etkisi (UI + backend)**

- UI’da ilgili buton/aksiyonlar (ödeme ekleme, indirim, kalem iptali, mutfakta durum güncelleme vb.) permission’a göre aktif/pasif olur.
- Mock backend (localStorage) tarafında kritik mutation’lar permission’a göre yetkilendirilir; yetkisiz aksiyonlar hata verir.

**Teknik not (demo)**

- Tenant seviyesinde `Tenant.permissions` alanı tutulur (role → permission → boolean).
- Kontrol helper’ı: `shared/lib/permissions.ts` (`hasPermission`).
- Enforcement: `shared/lib/mockApi.ts` içindeki mutation’larda permission check.

### 8.8 P0 — Cihaz yönetimi / oturum sonlandırma

**Amaç**

- Aynı kullanıcıyla birden fazla cihaz/sekmeden giriş yapılabilmesi.
- Kullanıcının (ve admin’in) aktif oturumları görüp **oturum sonlandırabilmesi**.

**Kullanım (Tüm roller)**

- Üst bardan **“Oturumlar”** butonuna bas.
- Oturum listesini görürsün ve **“Diğer cihazlardan çıkış”** ile diğer oturumları sonlandırabilirsin.

**Kullanım (Admin / ADMIN)**

- Admin → **Kullanıcılar** sekmesinde ilgili kullanıcı satırındaki **“Oturumlar”** aksiyonuna bas.
- Kullanıcının aktif oturumlarını görür, tek tek **sonlandırabilir** veya **tümünü sonlandırabilirsin**.

**Teknik not (demo)**

- Mock DB’de `sessions` tablosu tutulur.
- Auth state artık cihaz bazlıdır (sessionStorage’daki device id ile anahtarlandığı için aynı tarayıcıda çoklu sekme demo edilir).
- Oturumlar TTL + revoke ile yönetilir; revoke edilen/expire olan oturumlar UI’da periyodik kontrolle çıkışa düşer.

### 8.9 P0 — “Tükendi” işaretinin anlık yansıması + engelleme

**Amaç**

- Bir ürün “Tükendi / unavailable” yapıldığında garson ve mutfak ekranlarında hızlıca görünür olması.
- Operasyonel hata önleme: tükendi ürünü siparişe eklemeyi ve mutfağa göndermeyi engellemek.

**Kullanım (Admin / ADMIN)**

- Admin → Menü yönetiminden ilgili ürünü **Indisponible / Unavailable** yap.

**Etkisi (Garson / WAITER)**

- Menü ekranında ürün “Tükendi” etiketiyle görünür ve **ekleme butonu pasif** olur.
- Eğer ürün sonradan tükendiyse ve siparişte kaldıysa, **mutfağa gönder** sırasında backend hata verir ve UI kullanıcıya hata mesajı gösterir.

**Etkisi (Mutfak / KITCHEN)**

- Sipariş detaylarında, artık tükendi olan ürün kalemleri “Tükendi” etiketiyle görünür.

**Teknik not (demo)**

- “Anlık” davranış demo amaçlıdır: menü verisi periyodik polling (5s) + window focus’ta refetch ile güncellenir.
- UI tarafında `isAvailable=false` ürünlerde ekleme aksiyonu kapatılır.
- Mock backend tarafında da `internalCreateOrder` içinde `isAvailable=false` ürünler için hata döndürülerek **enforcement** sağlanır.

### 8.10 P0 — Hazırlama süresi & SLA (sipariş yaşı + gecikme göstergesi)

**Amaç**

- Mutfakta, siparişlerin kaç dakikadır beklediğini net görmek.
- Basit bir SLA eşiğinin üstüne çıkan siparişleri “Gecikti / Late” olarak işaretlemek.

**Kullanım (Mutfak / KITCHEN)**

- Mutfak dashboard’unda aktif sipariş kartının üst kısmında:
  - Sipariş saati
  - Sipariş yaşı (dakika)
  - SLA eşiği aşıldığında **Gecikti / Late** etiketi
    görünür.

**Teknik not (demo)**

- Sipariş yaşı `order.createdAt` üzerinden dakika bazında hesaplanır.
- Demo için sabit bir eşik kullanılır (ör. 7 dk). Ekran, yaş bilgisini periyodik “tick” ile güncel tutar.

### 8.11 P0 — Kampanya/menü seti (bundle) modeli

**Amaç**

- Birden fazla ürünü “set menü / bundle” olarak tek bir menü öğesi gibi satabilmek.
- Garsonun tek kalem ekleyerek set menüyü siparişe alabilmesi.
- Operasyonel kural: set menü içeriğinde tükendi ürün varsa siparişe eklenememesi.

**Kullanım (Admin / ADMIN)**

- Admin → Menü yönetiminde bir ürünü **Menü seti (bundle)** olarak işaretle.
- “Set içeriği” bölümünden set menünün içine girecek ürünleri seç.

**Kullanım (Garson / WAITER)**

- Menüde set menüler “Bundle/Menü seti” etiketiyle görünür.
- Set içeriğindeki ürünlerden biri tükendiyse, set menü **eklenemez**.

**Teknik not (demo)**

- Menü öğesinde `bundleItemIds?: string[]` tutulur.
- UI tarafında set menü siparişe eklenirken, bundle içeriğindeki ürünlerin uygunluğu kontrol edilir.
- Mock backend tarafında da sipariş oluşturma sırasında aynı kontrol yapılır (UI bypass edilse bile).

### 8.12 P1 — Günlük özet rapor + garson performansı (temel)

**Amaç**

- Belirli bir gün veya tarih aralığı için toplam ciro/sipariş sayısı/ortalama adisyonu görmek.
- Garson bazında performans (sipariş sayısı, ciro, ortalama adisyon) kırılımını görebilmek.

**Kullanım (Admin / ADMIN)**

- Admin panelinde **Raporlar** sekmesine gir.
- Tarih aralığı preset’lerini (bugün/dün/son 7 gün vb.) kullanabilir veya başlangıç-bitiş tarihini manuel seçebilirsin.
- Özet kartları + “Top Items” ve “Garson performansı” tablosu görünür.

**Teknik not (demo)**

- UI bileşeni: `features/reports/components/DailySummary.tsx`.
- Veri, mock backend tarafında kapanmış siparişlerden (CLOSED) agregasyon ile üretilir.
- Tek gün seçildiğinde “gün sonu” (end-of-day) kırılımı ayrıca gösterilir.

### 8.13 P1 — Yazıcı entegrasyonu (minimum)

**Amaç**

- Adisyon ve mutfak fişi için minimum yazdırma akışını desteklemek.
- Demo ortamında iki mod: **tarayıcı yazdırma** veya **print server**.

**Kullanım (Admin / ADMIN)**

- Admin → **Ayarlar** ekranında **Yazıcı** bölümünden yazdırma modunu seç:
  - **Browser print**: yeni bir print penceresi açıp `window.print()` ile yazdırır.
  - **Print Server**: URL tanımlayıp fişi sunucuya gönderir.

**Teknik not (demo)**

- Browser print helper: `shared/lib/print.ts`.
- Print server client: `shared/lib/printClient.ts`.
- Tenant ayarı: `Tenant.printConfig` (mode + opsiyonel serverUrl).

### 8.14 P2 — Entegrasyonlar (POS, online sipariş) (demo)

**Amaç**

- Demo ortamında online sipariş ve POS ödeme entegrasyonlarının sisteme nasıl “bağlanacağını” göstermek.
- Repo prod backend içermediği için entegrasyonlar UI üzerinden “simülasyon” olarak tetiklenir.

**Kapsam (demo yaklaşımı)**

- **Online sipariş**: Dış kaynaktan gelen sipariş, demo için seçilen bir **hedef masaya** sipariş olarak düşürülür.
- **POS ödeme**: Seçilen masadaki aktif adisyon için, demo POS “kalan tutarı kartla öde” şeklinde ödeme satırı ekler ve ödemeyi onaylar.

**Kullanım (Admin / ADMIN)**

- Admin → **Ayarlar** → **Entegrasyonlar (Demo)**
  - Online siparişler:
    - “Online siparişleri etkinleştir”i aç.
    - “Online siparişler için hedef masa” seç.
    - “Online sipariş simüle et” ile örnek sipariş düşür.
  - POS ödemeleri:
    - “POS ödemelerini etkinleştir”i aç.
    - “POS ile ödeme alınacak masa” seç.
    - “POS ödemesi simüle et (kalanı öde)” ile kalan tutar kadar kart ödemesi + ödeme onayı tetiklenir.

**Notlar**

- Demo’da entegrasyon event’leri sipariş notunda “Online sipariş” etiketiyle görünür.
- Gerçek hayatta bu event’ler backend tarafında doğrulanmalı (imza/secret), idempotency uygulanmalı ve tenant izolasyonu sağlanmalıdır.
