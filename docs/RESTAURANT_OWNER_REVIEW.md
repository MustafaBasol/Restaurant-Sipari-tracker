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
1) Ödeme & adisyon: ödeme türleri + split bill + indirim/ikram + kapanış
2) Menü modelini güçlendir: modifier/variant + alerjen
3) Mutfak istasyonları + gecikme göstergesi
4) Yetki matrisi + audit log (iptal/indirim/ödeme)

### P1 (işi kolaylaştırır)
1) Masa taşıma + masa birleştir/böl
2) Gün sonu raporu + garson performansı
3) Yazıcı entegrasyonu (minimum: mutfak fişi)

### P2 (ölçek)
1) Offline mod + senkron/çatışma çözümü
2) Entegrasyonlar (POS, online sipariş)

---

## 6) Kısa kullanıcı hikayeleri (örnek)

- Garson: “Masa 12’de 4 kişi ayrı ödeyecek; 2 kişi kart, 2 kişi nakit. Üç kalem iptal, bir kalem ikram.”
- Mutfak: “Bar istasyonuna düşen içecekler ayrı ekranda, 7 dakikayı geçenler kırmızı.”
- Admin: “Bugün kaç TL indirim yapıldı, kim yaptı, hangi masalarda?”

---

## 7) Notlar / Riskler

- Gerçek kullanım için veri kaynağı localStorage yerine sunucu + gerçek zamanlı senkron (örn. WebSocket) gerekebilir.
- Ödeme/fiş entegrasyonları ülkeye/cihaza göre değişir; ürün stratejisinde hedef pazar netleşmeli.
