# Finely ERP Yol Haritası

Bu belge, Finely'nin bir **nakit akışı ve gider takip uygulamasından**, bir
KOBİ'nin finans, satış, satın alma, stok, üretim ve insan kaynakları
süreçlerini tek bir yerden yönettiği, **ERP diye sunulmayı gerçekten hak
eden** bir ürüne nasıl dönüşeceğini anlatır.

Plan, mevcut altyapının (çok kiracılı yapı, şirketler ve ekipler, roller,
audit log, iki dil, Stripe, güvenlik, testler, CI) korunmasına ve alan
modelinin (`src/db/finance.ts`, `src/lib/finance/`, `src/lib/data/`) adım adım
genişletilip yer yer yeniden kurulmasına dayanır. Yeni bir proje açılmaz.

---

## İçindekiler

1. [Başlangıç noktası](#1-başlangıç-noktası)
2. [Hedef: "ERP" ne demek?](#2-hedef-erp-ne-demek)
3. [Değişmeyecek ilkeler](#3-değişmeyecek-ilkeler)
4. [Fazlar](#4-fazlar)
   - [Faz 0: Mimari temel](#faz-0-mimari-temel)
   - [Faz 1: Genel muhasebe çekirdeği](#faz-1-genel-muhasebe-çekirdeği)
   - [Faz 2: Cari hesaplar ve faturalar](#faz-2-cari-hesaplar-ve-faturalar)
   - [Faz 3: Çoklu para birimi, vergi ve nakit yönetimi](#faz-3-çoklu-para-birimi-vergi-ve-nakit-yönetimi)
   - [Faz 4: Ürünler ve stok](#faz-4-ürünler-ve-stok)
   - [Faz 5: Satış süreçleri](#faz-5-satış-süreçleri)
   - [Faz 6: Satın alma ve onay akışları](#faz-6-satın-alma-ve-onay-akışları)
   - [Faz 7: e-Dönüşüm](#faz-7-e-dönüşüm)
   - [Faz 8: Duran varlıklar ve yönetim muhasebesi](#faz-8-duran-varlıklar-ve-yönetim-muhasebesi)
   - [Faz 9: İnsan kaynakları ve bordro](#faz-9-insan-kaynakları-ve-bordro)
   - [Faz 10: Üretim (MRP)](#faz-10-üretim-mrp)
   - [Faz 11: Raporlama, API ve entegrasyonlar](#faz-11-raporlama-api-ve-entegrasyonlar)
   - [Faz 12: Kurumsal olgunluk](#faz-12-kurumsal-olgunluk)
5. [Mevcut özelliklerin akıbeti](#5-mevcut-özelliklerin-akıbeti)
6. [Kilometre taşları ve konumlandırma](#6-kilometre-taşları-ve-konumlandırma)
7. [Süre tahmini](#7-süre-tahmini)
8. [Riskler](#8-riskler)
9. ["ERP" demeden önce son kontrol listesi](#9-erp-demeden-önce-son-kontrol-listesi)

---

## 1. Başlangıç noktası

**Hazır olanlar (korunacak):**

| Alan | Durum |
|---|---|
| Çok kiracılı yapı | Her sorgu `organization_id` ile kapsanıyor ve izolasyon testleri var (`src/lib/data/isolation.test.ts`) |
| Şirketler, ekipler, davetler | Better Auth organizations. Bir kişi birden çok şirkette olabiliyor, bu mali müşavir erişimi için çok değerli |
| Roller | owner, admin ve member (`src/lib/roles.ts`) |
| Audit log | Olay olarak saklanıyor ve her dilde okunabiliyor |
| İki dil | Tipli sözlükler (`src/i18n/messages/{en,tr}`) |
| Abonelik | Stripe, plan başına ekip sınırı |
| Banka | CSV içe aktarma, Plaid ile senkron |
| Güvenlik | CSP, rate limiting, şifrelenmiş banka token'ları |
| Kalite | 336 unit ve 25 e2e testi, WCAG 2.1 AA, CI |

**Eksik veya yeniden kurulması gerekenler:**

- `transaction` tek taraflı bir banka hareketi. Ortada çift taraflı defter yok.
- `category`, hesap planının yerini tutmaya çalışıyor (sadece gelir ve gider).
- `bill` tek tutarlı bir ödeme hatırlatıcısı. Kalemi, KDV'si ve kısmi ödemesi yok.
- Müşteri, tedarikçi, ürün, depo, sipariş, fatura, personel gibi varlıklar yok.
- Şirket başına tek para birimi var (`company_settings.currency`).
- Tutarlar `numeric(14,2)` olarak tutuluyor ama JS `number` olarak okunuyor.
  Toplama için yeterli. Ancak miktar × birim fiyat × kur × KDV gibi
  çarpımlarda kayan nokta hatası verir.
- Dosyalar veritabanında base64 olarak duruyor. Fatura PDF'leri ve UBL
  dosyalarıyla bu ölçeklenmez.
- Uzun işler Vercel cron ile çalışıyor. Bir iş kuyruğu yok.

## 2. Hedef: "ERP" ne demek?

Bir yazılımın ERP diye sunulabilmesi için, **ortak bir veri modeli ve tek
bir genel muhasebe defteri** üzerinde, en az aşağıdaki süreçleri birbirine
bağlı yürütebilmesi gerekir. Burada "bağlı", bir satış siparişinin stoktan
düşmesi, faturalanması, cariye ve deftere işlenmesi, tahsilatının bankaya
yansıması demektir.

| # | Modül | Bu planda |
|---|---|---|
| 1 | Genel muhasebe (hesap planı, yevmiye, büyük defter, mizan, mali tablolar, dönem kapanışı) | Faz 1 |
| 2 | Cari hesaplar, alacak ve borç yönetimi | Faz 2 |
| 3 | Fatura (satış ve alış), vergi | Faz 2–3 |
| 4 | Nakit ve banka yönetimi, çek/senet, çoklu para birimi | Faz 3 |
| 5 | Stok ve depo yönetimi | Faz 4 |
| 6 | Satış (teklif → sipariş → irsaliye → fatura) | Faz 5 |
| 7 | Satın alma (talep → sipariş → mal kabul → fatura) | Faz 6 |
| 8 | Yasal uyum (e-Fatura, e-Arşiv, e-İrsaliye, e-Defter) | Faz 7 |
| 9 | Duran varlıklar, masraf merkezleri, bütçe ve gerçekleşen | Faz 8 |
| 10 | İnsan kaynakları ve bordro | Faz 9 |
| 11 | Üretim (ürün ağacı, iş emri, MRP) | Faz 10 |
| 12 | Raporlama, iş zekâsı, API, entegrasyonlar | Faz 11 |
| 13 | Kurumsal gereksinimler (ayrıntılı yetki, onay akışları, şube, ölçek, KVKK) | Faz 0, 6, 12 |

## 3. Değişmeyecek ilkeler

Bu kurallar her fazda geçerlidir ve kod incelemesinde kontrol edilir.

1. **Tek kaynak defterdir.** Fatura, tahsilat, stok çıkışı, amortisman, bordro
   gibi parasal etkisi olan her belge, bir **kayıt kuralı** üzerinden yevmiye
   kaydı üretir. Raporlar defterden okunur, modüller kendi toplamlarını
   ayrıca tutmaz.
2. **Kesinleşmiş kayıt değişmez.** Onaylanmış belge ve yevmiye kayıtları
   düzenlenemez veya silinemez. Düzeltme ters kayıtla (iptal veya
   düzeltme fişi) yapılır. Kapanmış dönemlere kayıt atılamaz.
3. **Her belgenin bir yaşam döngüsü vardır:** taslak → onaylı → (kısmen)
   kapanmış → iptal. Durum geçişleri tek bir yerde tanımlanır ve test edilir.
4. **Belge numaraları boşluksuz ve sıralıdır.** Seri ve yıl bazında, işlem
   (transaction) içinde ve kilitle verilir. e-Fatura bunu zorunlu kılar.
5. **Para hesapları ondalık kütüphanesiyle yapılır.** Tutarlar `string` veya
   `Decimal` tipinde taşınır. Yuvarlama kuralı (kalem bazında mı, belge
   bazında mı) tek bir yerde tanımlanır.
6. **Kiracı izolasyonu ve yetki her yeni tabloda test edilir.**
   `isolation.test.ts` her modülle birlikte genişletilir.
7. **Her faz kendi başına yayınlanabilir.** Bir faz bittiğinde demo verisi,
   iki dilde metinler, e2e testleri, erişilebilirlik kontrolleri ve
   `docs/features.md` güncellenmiş olur.
8. **Modüller paket olarak açılıp kapatılabilir.** Şirket bazında modül
   lisansı tutulur. Stripe planları modüllere göre fiyatlanır.

---

## 4. Fazlar

Büyüklükler: **S** en fazla 2 hafta, **M** 2–4 hafta, **L** 1–2 ay,
**XL** 2 aydan fazla. Tahminler tek geliştirici ve mevcut tempo içindir.

### Faz 0: Mimari temel

**Amaç:** Sonraki fazların üstüne oturacağı ortak yapı taşlarını kurmak.
Kullanıcıya görünen özellik azdır ama bu faz atlanırsa sonraki her faz
yavaşlar. **Büyüklük: L**

- **Para ve miktar tipleri**
  - `decimal.js` (veya benzeri) ile `Money` ve `Quantity` yardımcıları.
    Tutarlar 4 ondalık (`numeric(19,4)`), birim fiyat ve miktar 6 ondalık.
  - Drizzle'da `mode: "string"` kullanımına geçiş ve mevcut hesapların
    (`dashboard-summary`, `budgets`, `forecast`…) bu tiple yeniden yazılması.
- **Ayrıntılı yetkilendirme (RBAC)**
  - İzin listesi, örneğin `invoice.create`, `invoice.approve`,
    `journal.post`, `period.close`, `stock.adjust`, `payroll.view`.
  - Hazır roller: Sahip, Yönetici, Muhasebeci, Satış, Satın alma, Depo,
    İK, Salt okunur ve **Mali müşavir**. Şirkete özel rol de tanımlanabilir.
  - `src/lib/roles.ts` içindeki `canManage*` fonksiyonlarının izin
    kontrollerine taşınması.
- **Şirket yapısı**
  - Şube ve lokasyon tablosu. Depolar ve masraf merkezleri bunlara bağlanır.
  - Şirket kimliği: unvan, VKN veya TCKN, vergi dairesi, MERSİS, adres, logo.
    Bunlar faturalarda kullanılır.
- **Belge altyapısı**
  - Numara serileri servisi (bkz. ilke 4).
  - Genel belge durum makinesi (bkz. ilke 3).
  - Belgeler arası bağlantı tablosu (sipariş → irsaliye → fatura →
    tahsilat). Belge akışı ekranları bunu kullanır.
- **Dosya depolama:** Ekleri veritabanından nesne depolamaya (Vercel Blob,
  S3 veya R2) taşımak. İmzalı ve süreli bağlantılarla erişim, mevcut ekler
  için taşıma betiği.
- **Arka plan işleri:** Bir iş kuyruğu (Inngest, QStash veya
  Postgres tabanlı bir kuyruk). Gerekenler: tekrar deneme, zamanlama ve
  idempotency. Bunu banka senkronu, kur çekimi, e-Fatura gönderimi,
  amortisman ve bordro hesapları kullanır.
- **PDF üretimi:** Fatura, irsaliye, sipariş ve ekstre için şablonlu PDF
  (iki dilde, şirket logolu).
- **Arayüz altyapısı:** ERP ekranları için ortak bileşenler. Sanal
  kaydırmalı, sütunu seçilebilen, filtrelenebilen ve dışa aktarılabilen
  veri tablosu; kalem tablosu (satır ekle, sil, kopyala, klavyeyle gezin);
  arama yapılabilen seçim kutusu (cari, ürün, hesap).
- **Gezinme:** Kenar çubuğunun modül gruplarına ayrılması (Finans, Satış,
  Satın alma, Stok, Üretim, İK, Raporlar, Ayarlar) ve genel arama
  (Ctrl+K).

**Bitti sayılır:** Mevcut tüm özellikler yeni para tipiyle çalışıyor, roller
izin tabanlı, ekler nesne depolamada, iş kuyruğu üretimde bir iş çalıştırıyor
(örneğin banka senkronu).

### Faz 1: Genel muhasebe çekirdeği

**Amaç:** Finely'nin kalbini tek taraflı işlem listesinden **çift taraflı
deftere** çevirmek. Planın en kritik fazı budur. **Büyüklük: XL**

- **Hesap planı**
  - Tekdüzen Hesap Planı (TDHP) şablonu: 1 Dönen Varlıklar … 7 Maliyet
    Hesapları. Şirket kurulurken yüklenir.
  - Hiyerarşik hesaplar (ana hesap, alt hesap, detay hesap). Yalnızca
    detay hesaplara kayıt atılabilir.
  - İngilizce kullanıcılar için IFRS benzeri basit bir şablon.
- **Yevmiye fişi:** açılış, mahsup, tahsil ve tediye fişleri. Borç ve alacak
  eşitliği veritabanında kontrol edilir (kısıt veya tetikleyici ve servis
  katmanı). Her satırda hesap, cari, masraf merkezi, açıklama ve döviz
  alanları bulunur.
- **Kayıt motoru:** Belge türlerinin ("banka tahsilatı", "satış faturası" …)
  hangi hesaplara nasıl kayıt üreteceğini tanımlayan, şirket bazında
  ayarlanabilen kurallar.
- **Mali dönemler:** Mali yıl ve aylık dönemler. Dönem kilitleme, yıl sonu
  kapanış fişi ve yeni yıl açılış fişi.
- **Raporlar:** Yevmiye defteri, büyük defter (muavin), mizan, bilanço,
  gelir tablosu. Hepsi tarih aralığı ve karşılaştırmalı (önceki dönem)
  olarak, ayrıca PDF ve Excel çıktısıyla.
- **Mevcut verinin taşınması**
  - Her `financial_account`, 102 Bankalar veya 100 Kasa altında bir detay
    hesaba bağlanır.
  - Her `category` bir gelir veya gider hesabına eşlenir. Eşleme ekranı ve
    akıllı öneriler sunulur.
  - Mevcut her `transaction` için geriye dönük yevmiye kaydı üretilir.
    Kategorisi olmayanlar "Mutabakat bekleyen" geçici hesaba gider.
- **Banka mutabakatı:** Banka hareketleri (içe aktarılan veya senkronlanan)
  artık deftere ham giriş değil, **eşleştirilecek kalemler** olur. Banka
  ekstresi ile defter karşılaştırılır. Mevcut kategori kuralları
  (`category_rule`) "hesap kuralları"na dönüşür.

**Bitti sayılır:** Demo şirketin mizanı denk. Bilanço ve gelir tablosu
çıkıyor. Kapanmış bir döneme kayıt atılamıyor. Mevcut dashboard ve Insights
sayfaları defterden besleniyor ve sonuçlar taşıma öncesiyle aynı.

### Faz 2: Cari hesaplar ve faturalar

**Amaç:** Kime ne sattığını, kimden ne aldığını ve kimin kime ne kadar
borçlu olduğunu takip etmek. Bu faz bitince Finely tam bir **ön muhasebe**
ürünü olur. **Büyüklük: XL**

- **Cari kartlar**
  - Müşteri, tedarikçi veya ikisi birden. Unvan, VKN/TCKN, vergi dairesi,
    adresler (fatura ve teslimat), yetkililer, IBAN'lar.
  - Vade ve ödeme koşulu, risk limiti, varsayılan para birimi, etiketler,
    cari grupları.
  - Her carinin defterde 120 veya 320 altında kendi alt hesabı ya da cari
    boyutu olur.
- **Satış faturası:** Kalemler (şimdilik serbest metin ve hizmet, ürün
  kartları Faz 4'te). Miktar, birim, birim fiyat, satır ve genel iskonto,
  KDV oranları (%0, %1, %10, %20), KDV tevkifatı, istisna kodları.
  Taslak → onay → gönderildi → kısmen ödendi → ödendi → iptal.
- **Alış faturası:** Mevcut `bill` tablosunun yerini alır (bkz. bölüm 5).
  Satış faturasının aynısı, tedarikçi tarafında. Gider hesabı veya stok
  kalemi, fatura görseli ve OCR ile ön doldurma (isteğe bağlı) içerir.
- **İade, fiyat farkı ve gider pusulası** belgeleri.
- **Tahsilat ve ödeme**
  - Banka, kasa veya kredi kartıyla tahsilat ve ödeme.
  - Bir ödeme birden çok faturayı, bir fatura birden çok ödemeyi kapatabilir.
    Kısmi ödeme ve avans desteklenir.
  - Gelen banka hareketlerinin açık faturalarla otomatik eşleştirilmesi.
    Mevcut `bills.ts` eşleştirme mantığının genelleştirilmesiyle yapılır.
- **Raporlar:** Cari ekstre, borç ve alacak yaşlandırması (0–30 / 31–60 /
  61–90 / 90+), vadesi geçmişler, cari mutabakat mektubu (PDF ve e-posta).
- **Hatırlatmalar:** Vadesi yaklaşan veya geçmiş faturalar için müşteriye
  otomatik e-posta. Mevcut Resend altyapısı kullanılır.
- **Tekrarlayan faturalar:** Abonelik ve kira gibi. Mevcut `repeat` mantığı
  taşınır.
- **İçe aktarma:** Cari ve açık bakiye listesinin Excel veya CSV ile
  yüklenmesi.

**Bitti sayılır:** Bir satış faturası kesilip PDF olarak gönderilebiliyor.
Kısmi tahsilat yapılabiliyor. Cari ekstre ve yaşlandırma raporu doğru.
Tüm bu belgeler defterde doğru hesaplara kayıt üretiyor.

### Faz 3: Çoklu para birimi, vergi ve nakit yönetimi

**Amaç:** Türkiye'de çalışan bir şirketin günlük finans gerçekliğini
karşılamak. **Büyüklük: L**

- **Çoklu para birimi**
  - Şirketin raporlama para birimi ile döviz hesap, cari ve belgeler.
  - TCMB'den günlük kur çekimi (iş kuyruğu), elle kur girişi.
  - Belge ve satır bazında kur. Gerçekleşmiş ve gerçekleşmemiş kur farkı
    (646/656 hesapları), dönem sonu değerleme.
- **Vergi**
  - Vergi kodları tablosu: KDV, tevkifat oranları, stopaj, ÖTV ve
    konaklama vergisi.
  - KDV beyannamesine hazırlık raporu: hesaplanan / indirilecek / devreden.
  - Muhtasar için stopaj listesi.
  - Ba/Bs formu raporu (5.000 TL eşiği, parametrik).
- **Çek ve senet:** Alınan ve verilen çek/senet portföyü. Durumlar: portföyde,
  ciro edildi, tahsile verildi, teminata verildi, karşılıksız, ödendi.
  Vade takibi ve bordrolar (çek giriş/çıkış bordrosu).
- **Nakit yönetimi**
  - Kasa hesapları, virman (hesaplar arası transfer), kredi kartı hesapları
    (mevcut `card` tablosunun genişletilmesi).
  - Krediler: taksit planı, faiz ve anapara ayrımı.
- **Gelişmiş nakit tahmini:** Mevcut `forecast.ts`'in açık alacak, açık
  borç, çek/senet vadeleri, sipariş ve tekrarlayan kayıtlardan beslenmesi.
  Senaryo karşılaştırması da eklenir.

**Bitti sayılır:** Euro faturası kesilip TL tahsil edilebiliyor ve kur farkı
otomatik kaydediliyor. KDV raporu mizanla tutuyor. Bir çek alınıp ciro
edilebiliyor.

### Faz 4: Ürünler ve stok

**Amaç:** Fiziksel mal satan veya kullanan şirketleri desteklemek.
**Büyüklük: XL**

- **Ürün ve hizmet kartları:** Kod, barkod, ad, grup ve kategori, birimler ve
  birim dönüşümleri (koli = 12 adet), varyantlar (renk, beden), varsayılan
  KDV, satış ve alış hesapları, görseller.
- **Depolar ve lokasyonlar:** Şubeye bağlı depolar, isteğe bağlı raf ve
  lokasyon.
- **Stok hareketleri:** Giriş, çıkış, depolar arası transfer, sayım fişi,
  fire ve sarf. Hepsi tek bir `stock_movement` defterinde, değişmez kayıt
  olarak tutulur.
- **Maliyetlendirme:** Hareketli ağırlıklı ortalama (varsayılan) ve FIFO.
  Satılan malın maliyeti (621) ve stok (153) kayıtları otomatik üretilir.
- **İzlenebilirlik:** Lot ve parti numarası, son kullanma tarihi, seri
  numarası (isteğe bağlı, ürün bazında).
- **Planlama:** Minimum ve maksimum stok, yeniden sipariş noktası, kritik
  stok bildirimi (mevcut bildirim zili kullanılır).
- **Raporlar:** Stok durumu (depo ve lokasyon bazında), stok hareket
  ekstresi, stok değerleme, devir hızı, ABC analizi, hareketsiz stoklar.
- **Fiyat listeleri:** Müşteri grubu, dönem ve para birimi bazında fiyatlar
  ve iskontolar.

**Bitti sayılır:** Bir ürünün alışı stoğu ve maliyeti artırıyor, satışı
stoğu düşürüp satılan malın maliyetini kaydediyor. Sayım farkları deftere
yansıyor. Stok değerleme raporu 153 hesabının bakiyesiyle tutuyor.

### Faz 5: Satış süreçleri

**Amaç:** Satışı faturadan önce başlatmak ve belgeleri birbirine bağlamak.
**Büyüklük: L**

- **Teklif:** Versiyonlama, geçerlilik süresi, PDF ve e-posta, müşteri
  onay bağlantısı.
- **Satış siparişi:** Tekliften dönüşüm, stok rezervasyonu, kısmi
  sevkiyat, kapora.
- **İrsaliye ve sevkiyat:** Siparişten irsaliye, kısmi teslim, irsaliyeden
  fatura (birden çok irsaliye tek faturaya bağlanabilir).
- **İade süreci:** Müşteri iadesi → iade irsaliyesi → iade faturası →
  stok girişi.
- **Satış raporları:** Müşteri, ürün, temsilci ve bölge bazında satış;
  sipariş karşılama oranı; teklif → sipariş dönüşüm oranı.
- **Hafif CRM:** Fırsatlar (pipeline), aktiviteler (arama, toplantı, not),
  satış temsilcisi ataması ve prim için hedefler.
- **Belge akışı görünümü:** Bir belgeden önceki ve sonraki tüm belgelere
  (teklif → sipariş → irsaliye → fatura → tahsilat) tek tıkla ulaşılır.

**Bitti sayılır:** Teklif → sipariş → kısmi irsaliye → fatura → tahsilat
zinciri uçtan uca bir e2e testiyle çalışıyor. Stok ve defter her adımda
doğru.

### Faz 6: Satın alma ve onay akışları

**Amaç:** Satın almayı kontrollü hale getirmek ve şirket içi onay
mekanizmasını kurmak. **Büyüklük: L**

- **Genel onay akışı motoru:** Herhangi bir belge türü için kural tabanlı
  onay. Örneğin "10.000 TL üzeri satın alma siparişi önce departman
  yöneticisi, sonra finans onayı". Vekâlet (izindeki onaycının yerine
  başkası), e-posta ve bildirimle onay, onay geçmişi (audit log'a).
- **Satın alma talebi:** Çalışanın ihtiyaç bildirmesi, onay, siparişe
  dönüşüm. Stok seviyesinden otomatik talep de oluşturulabilir (Faz 4).
- **Tedarikçi teklifi karşılaştırma:** Birden çok tedarikçiden fiyat
  isteyip yan yana karşılaştırma.
- **Satın alma siparişi → mal kabul → alış faturası:** Kısmi teslim
  desteklenir. **Üçlü eşleştirme** (sipariş, mal kabul ve fatura miktar ve
  fiyat kontrolü), tolerans aşımında uyarı veya onay istenir.
- **Masraf yönetimi:** Çalışan masraf fişi (fotoğraf ve OCR), onay,
  çalışan cari hesabına (335) borç ve ödeme. Mevcut `card` ve eklerin
  doğal devamıdır.
- **Raporlar:** Tedarikçi performansı (teslim süresi, fiyat değişimi),
  açık siparişler, satın alma bütçesi ve gerçekleşen.

**Bitti sayılır:** Onaysız sipariş gönderilemiyor. Mal kabul olmadan
faturası ödemeye açılmıyor (ayarlanabilir). Onay geçmişi denetlenebiliyor.

### Faz 7: e-Dönüşüm

**Amaç:** Türkiye'de ERP olarak satılabilmenin yasal ön koşulu.
**Büyüklük: L** (entegratör seçimine göre değişir)

- **Strateji:** GİB'e doğrudan değil, bir **özel entegratör** üzerinden
  bağlanmak. Entegratör API'si bir adaptör arayüzünün arkasına konur ki
  sonradan değiştirilebilsin.
- **e-Fatura ve e-Arşiv**
  - Faturadan UBL-TR 1.2 XML üretimi, XSLT şablonu, gönderim, durum takibi
    (kuyruk), gelen faturaların alınıp **alış faturası taslağına**
    dönüştürülmesi.
  - Kabul/red (ticari fatura) ve mükellef sorgusu: alıcı e-Fatura
    mükellefi mi, değilse e-Arşiv.
- **e-İrsaliye:** Faz 5 irsaliyelerinden.
- **e-Defter:** Yevmiye ve büyük defter beratları. Faz 1 defteri bunu
  doğrudan besler. Çoğu KOBİ'de mali müşavir hazırlar, bu yüzden en azından
  dışa aktarma ve entegratöre gönderme sağlanmalıdır.
- **e-SMM (serbest meslek makbuzu)** ve **e-Müstahsil** (isteğe bağlı).
- **Arşiv:** Gönderilen ve alınan tüm belgelerin yasal süre (10 yıl)
  saklanması. Faz 0'daki nesne depolama kullanılır.

**Bitti sayılır:** Entegratörün test ortamında e-Fatura ve e-Arşiv
gönderilip alınabiliyor. Gelen e-Fatura tek tıkla alış faturasına
dönüşüyor.

### Faz 8: Duran varlıklar ve yönetim muhasebesi

**Amaç:** Muhasebenin "yönetim" tarafını tamamlamak. **Büyüklük: M**

- **Duran varlıklar (sabit kıymetler):** Demirbaş kartları, alış (alış
  faturasından), amortisman (normal ve azalan bakiyeler, VUK oranları),
  aylık ve yıllık otomatik amortisman fişi, satış ve hurdaya çıkarma,
  zimmet (personele atama).
- **Masraf ve kâr merkezleri:** Departman, şube ve proje boyutları. Her
  yevmiye satırına boyut atanır. Merkez bazında gelir tablosu çıkar.
- **Proje muhasebesi:** Proje bazında gelir, gider, saat ve kârlılık.
  Hizmet şirketleri için önemlidir (demo şirket de bir tasarım stüdyosu).
- **Bütçeleme:** Mevcut kategori bütçelerinin yerine **hesap ve masraf
  merkezi bazında, aylık farklılaşabilen** bütçeler. Bütçe/gerçekleşen
  sapma raporu, revizyonlar ve onay. Bu, README'deki "Budgets are the same
  every month" kısıtını da kaldırır.
- **Konsolidasyon (temel):** Aynı kişinin birden çok şirketini grup olarak
  birleştirip konsolide mizan almak, şirketler arası işlemleri elemek.

### Faz 9: İnsan kaynakları ve bordro

**Amaç:** Personeli ve personel maliyetini yönetmek. **Büyüklük: XL**

- **Personel kartları:** Kimlik, iletişim, departman, pozisyon, yönetici,
  işe giriş ve çıkış, sözleşmeler, özlük belgeleri (şifreli ve yalnızca İK
  yetkisiyle görülebilir).
- **Organizasyon şeması**, pozisyonlar, kadro.
- **İzin yönetimi:** Yıllık izin hak edişi (kıdeme göre), izin talebi →
  onay (Faz 6 motoru), izin takvimi, bakiye.
- **Puantaj:** Çalışılan gün, fazla mesai, devamsızlık.
- **Bordro (Türkiye)**
  - Brütten nete ve netten brüte hesap.
  - SGK işçi ve işveren payları, işsizlik sigortası, gelir vergisi
    (kümülatif matrah ve dilimler), damga vergisi, asgari ücret istisnası,
    teşvikler.
  - Bordro pusulası (PDF), toplu ödeme talimatı (banka dosyası), bordro
    yevmiye fişi (770/335/360/361).
  - **Parametreler yıl bazında tablo olarak tutulur** (oranlar, dilimler,
    asgari ücret), koda gömülmez.
  - Bu hesaplar için kapsamlı ve hazır örneklerle doğrulanmış test
    senaryoları (mevzuat örnekleri) yazılır.
- **Dışa aktarma:** SGK aylık prim ve hizmet belgesi (MUHSGK) için
  hazırlık dosyası.
- **Self servis:** Çalışanın kendi bordrosunu, izin bakiyesini ve
  masraflarını gördüğü sınırlı bir portal.

> Not: Bordro, mevzuat sorumluluğu yüksek bir alandır. Alternatif yol olarak
> önce personel, izin ve masraf yapılır. Bordro ise bir bordro servisiyle
> entegrasyon veya dışa aktarma ile sağlanır, kendi motoru sonraya bırakılır.
> Hangi yolun seçildiği "ERP" iddiasını değiştirmez. Önemli olan, personel
> maliyetinin deftere ve masraf merkezlerine doğru yansımasıdır.

### Faz 10: Üretim (MRP)

**Amaç:** Üretim yapan KOBİ'leri desteklemek. Bu, bir ERP'yi muhasebe
yazılımından ayıran temel modüldür. **Büyüklük: XL**

- **Ürün ağacı (BOM):** Çok seviyeli, versiyonlu reçeteler; yarı mamul;
  fire oranları.
- **Rotalar ve iş merkezleri:** Operasyonlar, süreler, makine ve işçilik
  maliyet oranları, kapasite.
- **İş emri:** Siparişten veya stok ihtiyacından oluşturma; hammadde
  rezervasyonu ve sarfı; mamul girişi; yarı mamul takibi; durumlar
  (planlandı, başladı, tamamlandı).
- **MRP:** Satış siparişleri, stok seviyeleri ve ürün ağaçlarından net
  ihtiyaç hesabı. Önerilen satın alma ve iş emirleri, onayla belgeye
  dönüşür.
- **Üretim maliyeti:** Gerçek maliyet (hammadde + işçilik + genel üretim
  giderleri), standart ve gerçek maliyet farkı, 7/A maliyet hesaplarına
  kayıt.
- **Fason üretim:** Malzemenin fasoncuya gönderilmesi ve mamulün geri
  alınması.
- **Atölye ekranı:** Tablet uyumlu, operatörün iş başlatıp bitirdiği ve
  sarf ile fire girdiği basit ekran.

### Faz 11: Raporlama, API ve entegrasyonlar

**Amaç:** Verinin şirketin geri kalanıyla ve yönetimle buluşması.
**Büyüklük: L**

- **Rapor merkezi:** Tüm raporlar tek yerde. Kaydedilmiş filtreler,
  favoriler, zamanlanmış rapor e-postası (mevcut haftalık özetin
  genelleştirilmesi), Excel (xlsx) ve PDF çıktısı.
- **Yönetim panoları:** Rol bazında dashboard'lar (CEO, finans, satış,
  depo). Widget'larla özelleştirilebilir. Mevcut Insights sayfası finans
  panosuna dönüşür.
- **Finansal analiz:** Oranlar (cari oran, likidite, DSO/DPO, brüt kâr
  marjı), trendler, karşılaştırmalar.
- **Genel REST API:** API anahtarları (izin kapsamlı), OpenAPI belgesi,
  rate limit, sayfalama. Webhook'lar: fatura oluştu, ödeme alındı, stok
  kritik seviyede…
- **Entegrasyonlar**
  - e-ticaret: Shopify, WooCommerce, Trendyol, Hepsiburada. Sipariş ve
    stok senkronu.
  - Ödeme: iyzico, PayTR. Sanal POS tahsilatları cariye işlenir.
  - Kargo firmaları: gönderi ve takip numarası.
  - Türk bankaları: mevcut Plaid yerine veya yanında bir açık bankacılık
    sağlayıcısı ya da banka ekstresi (MT940) içe aktarma.
- **Geçiş araçları:** Logo, Mikro, Netsis ve Paraşüt'ten cari, ürün,
  açılış bakiyesi ve hesap planı aktarımı. Doğrulama raporuyla birlikte.
- **Mobil:** PWA (çevrimdışı okuma, masraf fişi fotoğrafı, onaylar,
  stok sayımı için barkod okutma).

### Faz 12: Kurumsal olgunluk

**Amaç:** Ürünün gerçek müşterilere güvenle satılabilmesi. Bu fazın bir
kısmı diğer fazlarla paralel yürür. **Büyüklük: L**

- **Ölçek ve performans:** Büyük şirketler için (yüz binlerce fatura,
  milyonlarca yevmiye satırı) indeksler, bakiye özet tabloları ve
  materialized view'lar, rapor sorgularının ayrı bir okuma replikasına
  yönlendirilmesi, yük testleri.
- **Veri güvenliği ve KVKK:** Aydınlatma metinleri, açık rıza ve kişisel veri
  envanteri, veri saklama ve imha politikası (yasal saklama süreleriyle
  uyumlu), Türkiye'de veri barındırma seçeneği, hassas alanların (bordro,
  kimlik) şifrelenmesi.
- **Erişim güvenliği:** İki faktörlü doğrulama (zorunlu kılınabilir),
  SSO (Google Workspace, Microsoft Entra), IP kısıtlama, oturum yönetimi.
- **İş sürekliliği:** Otomatik yedek ve geri yükleme tatbikatı (Neon
  point-in-time), durum sayfası, SLA, olay müdahale prosedürü.
- **Şirket silme:** README'deki "Deleting a company is immediate" kısıtı
  kalkar. Bunun yerine bekleme süresi, tam veri dışa aktarma ve yasal
  saklama yükümlülüğü gelir.
- **Mali müşavir paneli:** Bir müşavirin tüm müşteri şirketlerini tek
  ekranda görmesi, toplu işlemler, müşavir fiyatlandırması.
- **Yardım ve destek:** Uygulama içi yardım, Türkçe kullanım kılavuzu,
  video eğitimler, örnek şirket şablonları (hizmet, ticaret, üretim).
- **Fiyatlandırma:** Modül bazlı planlar (Ön Muhasebe, Ticari, Üretim,
  İK eklentisi), kullanıcı ve şirket sayısı, TL fiyatlandırma ve yerel
  ödeme. Stripe yerine veya yanında iyzico.
- **Dil:** Hesap planı, vergi ve e-Dönüşüm Türkiye'ye özgüdür. İngilizce
  arayüz kalır ama yabancı ülke muhasebesi (lokalizasyon) kapsam dışıdır,
  bu açıkça belirtilir.

---

## 5. Mevcut özelliklerin akıbeti

| Bugünkü özellik | Dönüşeceği şey | Faz |
|---|---|---|
| `financial_account` (banka hesapları) | 100/102 altında detay hesaplar ve banka modülü | 1, 3 |
| `transaction` | Banka hareketi ve mutabakat kalemi. Asıl kayıt yevmiyedir | 1 |
| `category` | Gelir ve gider hesaplarına eşleme, sonra raporlama grupları | 1 |
| `category_rule` | Banka hareketi → hesap ve cari eşleştirme kuralları | 1–2 |
| `bill` | Alış faturası ve ödeme planı. Tekrarlayanlar tekrarlayan faturaya dönüşür | 2 |
| `card` | Kredi kartı hesapları ve çalışan masrafları | 3, 6 |
| `attachment` | Genel belge eki (her belge türü için), nesne depolamada | 0 |
| Bütçeler | Hesap ve masraf merkezi bazlı, aylık bütçeler | 8 |
| Tahmin (`forecast.ts`) | Alacak, borç, çek ve siparişlerden beslenen nakit tahmini | 3 |
| Düzenli ödemeler (`recurring.ts`) | Tekrarlayan fatura ve fiş önerileri | 2 |
| Olağandışı harcamalar | Genel anomali uyarıları (fiyat sapması, mükerrer fatura) | 6, 11 |
| Insights ve dashboard | Finans panosu ve rol bazlı panolar | 11 |
| Haftalık özet e-postası | Zamanlanmış rapor e-postaları | 11 |
| Audit log | Aynen kalır, tüm modüllere genişler | Her faz |
| Roller (owner, admin, member) | İzin tabanlı RBAC | 0 |
| Plaid | Türk bankaları için ek sağlayıcı ve MT940 | 11 |
| Demo şirket | Her fazda yeni modüllerin örnek verisiyle genişler | Her faz |

Taşımalar **geri alınabilir migration'lar** ve taşıma öncesi ile sonrasında
toplamların eşitliğini kontrol eden testlerle yapılır.

## 6. Kilometre taşları ve konumlandırma

Ürün, her kilometre taşında **o anki gerçek durumunu yansıtan** adla
tanıtılır.

| Kilometre taşı | Tamamlanan fazlar | Doğru konumlandırma |
|---|---|---|
| **M1** | 0, 1 | "Bulut muhasebe ve nakit akışı" |
| **M2** | 2, 3 | "KOBİ'ler için ön muhasebe" (Paraşüt ve BizimHesap seviyesi) |
| **M3** | 4, 5, 6 | "Ticari işletmeler için bulut iş yönetimi" (stoklu, siparişli, onaylı) |
| **M4** | 7, 8 | **"KOBİ ERP"**: e-Dönüşüm uyumlu, yasal ve yönetim muhasebesiyle |
| **M5** | 9, 10, 11, 12 | **"Bulut ERP"**: İK, üretim, entegrasyonlar ve kurumsal hazırlıkla |

M4'ten önce "ERP" kelimesi ürün adında ve ana mesajda kullanılmaz.

## 7. Süre tahmini

Kaba tahmindir. Tek geliştirici ve mevcut kalite çıtası (testler, iki dil,
erişilebilirlik) baz alınmıştır.

| Faz | Büyüklük | Tahmini süre |
|---|---|---|
| 0: Mimari temel | L | 6–8 hafta |
| 1: Genel muhasebe | XL | 10–12 hafta |
| 2: Cari ve faturalar | XL | 10–12 hafta |
| 3: Döviz, vergi, nakit | L | 6–8 hafta |
| 4: Ürün ve stok | XL | 8–10 hafta |
| 5: Satış | L | 6 hafta |
| 6: Satın alma ve onay | L | 6 hafta |
| 7: e-Dönüşüm | L | 6–8 hafta |
| 8: Duran varlık ve yönetim muhasebesi | M | 4–6 hafta |
| 9: İK ve bordro | XL | 10–12 hafta |
| 10: Üretim | XL | 10–12 hafta |
| 11: Raporlama ve entegrasyonlar | L | 8 hafta |
| 12: Kurumsal olgunluk | L | 6–8 hafta (kısmen paralel) |
| **Toplam** | | **yaklaşık 2–2,5 yıl** |

Süreyi kısaltmak için:

- **M4'e odaklanmak** (Faz 0–8, yaklaşık 15–18 ay). Satılabilir bir KOBİ ERP'si için yeterlidir.
- Bordro (Faz 9) için entegrasyon yolunu seçmek.
- Üretimi (Faz 10) hedef müşteri gerçekten üretici olduğunda yapmak.
- Faz 4 ile Faz 3'ü, Faz 11'in entegrasyon kısmını da diğer fazlarla paralel yürütmek.

## 8. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Muhasebe ve mevzuat bilgisinin eksik olması | Yanlış kayıt kuralları, güven kaybı | Bir mali müşavirle danışmanlık ilişkisi. Faz 1–3 ve 7 çıktılarının müşavire doğrulatılması. Mevzuat örneklerinden testler |
| Faz 1'de mevcut verinin taşınması | Bakiyelerin kayması | Taşıma öncesi ve sonrası toplam eşitliği testleri, prova taşımaları, geri dönüş planı |
| Kapsamın büyümesi | Hiçbir modülün bitmemesi | Her fazın "Bitti sayılır" ölçütü. Bir faz bitmeden sonrakine başlanmaz (paralel yürütülebilecek olanlar hariç) |
| Performans (büyük defter, raporlar) | Yavaş ekranlar | Faz 1'den itibaren bakiye özet tabloları, büyük demo verisiyle yük testi |
| Entegratör ve banka bağımlılıkları | Kilitlenme, maliyet | Adaptör arayüzleri, en az iki sağlayıcıyla test |
| Mevzuat değişiklikleri (oranlar, e-Dönüşüm eşikleri) | Hatalı hesap | Tüm oran ve eşiklerin tarih aralıklı parametre tablolarında tutulması |
| Rakiplerin olgunluğu (Logo, Mikro, Netsis, Odoo, Paraşüt) | Pazar payı | Fark yaratan noktalar: modern arayüz, kurulumsuz bulut, otomatik eşleştirme ve tespitler (mevcut Insights mirası), mali müşavir deneyimi |

## 9. "ERP" demeden önce son kontrol listesi

Aşağıdakilerin **hepsi** "evet" olduğunda Finely ERP olarak sunulabilir.

**Entegrasyon**
- [ ] Parasal etkisi olan her belge, kayıt motoru üzerinden yevmiye kaydı üretiyor ve mizan her zaman denk.
- [ ] Teklif → sipariş → irsaliye → fatura → tahsilat → banka mutabakatı zinciri, stok ve defter dahil, uçtan uca otomatik testle kanıtlanmış.
- [ ] Talep → onay → satın alma siparişi → mal kabul → alış faturası → ödeme zinciri (üçlü eşleştirmeyle) uçtan uca test edilmiş.
- [ ] İş emri → hammadde sarfı → mamul girişi → maliyet kaydı zinciri test edilmiş (üretim modülü sunuluyorsa).

**Muhasebe ve uyum**
- [ ] TDHP, mali dönemler, dönem kilitleme, yıl sonu kapanış ve açılış.
- [ ] Bilanço, gelir tablosu, mizan, yevmiye ve büyük defter raporları bir mali müşavir tarafından doğrulanmış.
- [ ] Çoklu para birimi ve kur farkı, KDV, tevkifat, stopaj, Ba/Bs.
- [ ] e-Fatura, e-Arşiv ve e-İrsaliye canlı ortamda çalışıyor, e-Defter verisi üretilebiliyor.

**Operasyon**
- [ ] Cari, ürün, depo, fiyat listesi, lot ve seri yönetimi.
- [ ] Duran varlık ve amortisman, masraf merkezleri, aylık bütçe ve gerçekleşen.
- [ ] Personel, izin ve masraf; bordro (kendi motoru veya entegrasyon) deftere yansıyor.

**Platform**
- [ ] İzin tabanlı roller ve belge bazlı onay akışları.
- [ ] Şube ve depo yapısı, birden çok şirket ve temel konsolidasyon.
- [ ] REST API ve webhook'lar, en az bir e-ticaret ve bir ödeme entegrasyonu.
- [ ] Diğer yazılımlardan geçiş araçları.
- [ ] 2FA, KVKK uyumu, yedekleme ve geri yükleme tatbikatı, büyük veriyle performans testi.
- [ ] Her modül için iki dilde dokümantasyon, demo verisi, e2e ve erişilebilirlik testleri.
