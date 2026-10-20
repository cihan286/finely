import type { PageSection, site as en } from "../en/site";

export const site: typeof en = {
  about: {
    metaDescription:
      "Finely, bir işletmeye parasına dair tek ve net bir görünüm sunar: ne geldi, ne gitti ve gidişat nereye.",
    label: "Hakkında",
    title: "Şirketinizin parasına tek ve net bir bakış",
    intro:
      "Finely, tablolarla boğuşmadan nerede durduğunu bilmek isteyen işletmeler içindir. Banka hesap dökümlerinizi getirin; Finely ne geldiğini, ne gittiğini ve neyin ikinci kez bakmayı hak ettiğini göstersin.",
    doesHeading: "Finely ne yapar",
    does: [
      "<b>Her ödemeyi tek bir yerde tutar.</b> İşlemlerin kendiliğinden gelmesi için bankanızı bağlayın, elle ekleyin ya da bankanızın CSV dökümünü içe aktarın. Aynı dökümü iki kez içe aktarmak sorun olmaz: zaten var olan satırlar atlanır.",
      "<b>Harcamaları sizin için sınıflandırır.</b> Finely'ye bir kez “AWS”nin Yazılım ve BT olduğunu söyleyin, o andan itibaren bu ödemeleri kendisi kategorilere ayırsın.",
      "<b>Paranın nereye gittiğini gösterir.</b> Son 3, 6 veya 12 ay için nakit akışı, kategoriye ve tedarikçiye göre harcamalar ve gelirinizin ne kadarını elinizde tuttuğunuz.",
      "<b>Olağandışı olanı işaret eder.</b> Bir tedarikçinin normalde kestiğinin çok üzerinde bir tutar, sıfırın altına düşen bir hesap, çok uzun süredir beklemede olan bir ödeme.",
    ],
    teamsHeading: "Ekipler için tasarlandı",
    teams:
      "Herkes kendi şirketinin içinde çalışır. Sahipler ve yöneticiler ekip arkadaşlarını davet eder, hesapları ve kategorileri kimin yönetebileceğine karar verir ve erişimi istedikleri an kaldırabilir. Birden fazla işletmeyle çalışıyorsanız, oturumu kapatmadan aralarında geçiş yapabilirsiniz.",
    dataHeading: "Verilerinize nasıl davranıyoruz",
    data: "Bir şirketin verileri yalnızca o şirketteki kişilere gösterilir. Finely banka giriş bilgilerinizi asla görmez: dökümleri kendiniz içe aktarırsınız ya da bankanızı Plaid üzerinden bağlayıp orada giriş yaparsınız. Tutarlar kuruşu kuruşuna saklanır ve tarihler şirketinizin kendi saat dilimine göre tutulur; böylece rakamlar bankanızınkilerle örtüşür.",
    contactUs: "Bize ulaşın",
  },
  contact: {
    metaDescription:
      "Finely, Enterprise planı veya hesabınız hakkında sorularınız mı var? Bize bir mesaj gönderin.",
    label: "İletişim",
    title: "Bizimle konuşun",
    intro:
      "Enterprise planını mı merak ediyorsunuz, bir yerde mi takıldınız, yoksa Finely için bir fikriniz mi var? Bize bir mesaj gönderin, e-postayla yanıt verelim.",
    sent: "Teşekkürler! Mesajınız yola çıktı. Size e-postayla yanıt vereceğiz.",
    tooMany: "Kısa sürede birkaç mesaj gönderdiniz. Lütfen bir saat sonra tekrar deneyin.",
    notSent: "Mesajınızı gönderemedik. Lütfen daha sonra tekrar deneyin.",
    nameMissing: "Lütfen adınızı yazın.",
    emailInvalid: "Size yanıt verebilmemiz için lütfen geçerli bir e-posta adresi girin.",
    messageMissing: "Lütfen bir mesaj yazın.",
    tooLong: "{field} en fazla {max} karakter olabilir.",
    fieldName: "Adınız",
    fieldEmail: "E-posta adresiniz",
    fieldCompany: "Şirket adı",
    fieldMessage: "Mesajınız",
  },
  legal: {
    label: "Yasal",
    updated: "Son güncelleme: {date}",
  },
  terms: {
    title: "Hizmet şartları",
    metaDescription: "Finely ile onu kullanan kişiler ve şirketler arasındaki sözleşme.",
    intro:
      "Bu şartlar, Finely web sitesini ve uygulamasını kullandığınızda sizinle Finely, Inc. arasındaki sözleşmedir. Bir hesap oluşturarak bu şartları kabul etmiş olursunuz.",
    sections: [
      {
        heading: "1. Finely nedir",
        paragraphs: [
          "Finely, işletmelerin paralarını takip etmesine yardımcı olur: işlemler, faturalar, bütçeler ve bunların toplamda ne anlama geldiği. Size kendi kayıtlarınızı daha net bir şekilde gösterir. Bir banka değildir, para transferi yapmaz ve muhasebe, vergi, hukuk veya yatırım tavsiyesi vermez. Tahminler ve diğer öngörüler yalnızca birer tahmindir.",
        ],
      },
      {
        heading: "2. Hesabınız",
        list: [
          "Bize gerçek bir ad ve okuyabildiğiniz bir e-posta adresi verin.",
          "Şifrenizi kimseyle paylaşmayın. Hesabınız altında olanlardan siz sorumlusunuz; başka biri hesabınıza girdiyse bize hemen haber verin.",
          "Sözleşme yapabilecek yaşta olmalı ve kurduğunuz veya katıldığınız şirket adına hareket etmeye yetkili olmalısınız.",
        ],
      },
      {
        heading: "3. Şirketler ve ekipler",
        paragraphs: [
          "Herkes bir şirketin içinde çalışır. Şirketi kuran kişi onun sahibidir. Sahipler ve yöneticiler kimin davet edileceğine, her kişinin hangi role sahip olacağına ve kimin çıkarılacağına karar verir. Sahip, şirketi başka bir üyeye devredebilir veya tüm verileriyle birlikte silebilir. Ekibinin Finely'de yaptıklarından şirket sorumludur.",
        ],
      },
      {
        heading: "4. Verileriniz",
        paragraphs: [
          "Sizin ve ekibinizin Finely'ye girdiği veriler sizin olarak kalır. Bunları yalnızca size Finely'yi sunmak amacıyla saklamamıza ve işlememize izin verirsiniz. Bu verileri oraya koyma hakkına sahip olmaktan ve doğruluklarından siz sorumlusunuz. Kişisel verileri nasıl işlediğimiz <privacy>Gizlilik politikamızda</privacy> anlatılmaktadır.",
        ],
      },
      {
        heading: "5. Yapamayacaklarınız",
        list: [
          "Finely'yi yasa dışı herhangi bir şey için veya birini aldatmak için kullanmak.",
          "Başka bir şirketin verilerine ulaşmaya çalışmak veya Finely'nin güvenliğini aşmak.",
          "Finely'ye aşırı yük bindirmek, onu aksatmak veya onayımız olmadan ona karşı otomatik araçlar kullanmak.",
          "Finely'yi kopyalamak, yeniden satmak veya tersine mühendislik uygulamak.",
        ],
        after: ["Bunlardan herhangi birini yapan bir hesabı askıya alabiliriz."],
      },
      {
        heading: "6. Planlar ve ödeme",
        paragraphs: [
          "Finely'nin ücretsiz bir planı ve bir şirketin ekibinde kaç kişi olabileceğine göre farklılaşan ücretli planları vardır. Ücretli plan, şirket sahibinin başlattığı ve Stripe üzerinden ödediği bir aboneliktir; iptal edilene kadar her ay veya her yıl yenilenir ve sahip bunu istediği zaman Ayarlar'dan iptal edebilir. İptal edilen plan, ödemesi yapılmış dönemin sonuna kadar etkin kalır. Fiyat, siz onaylamadan önce gösterilir ve onayınız olmadan hiçbir ücret alınmaz. Fiyatları değiştirirsek size önceden haber veririz ve yeni fiyat uygulanmadan önce aboneliği durdurabilirsiniz. Bir şirketi silmek aboneliğini de sona erdirir.",
        ],
      },
      {
        heading: "7. Erişilebilirlik ve değişiklikler",
        paragraphs: [
          "Finely'yi çalışır durumda ve verilerinizi güvende tutmak için çalışırız, ancak her zaman erişilebilir veya hatasız olacağını garanti etmeyiz. Özellik ekleyebilir, değiştirebilir veya kaldırabiliriz. Kaybetmeyi göze alamayacağınız kayıtların kopyalarını kendiniz saklayın; işlemlerinizi istediğiniz zaman dışa aktarabilirsiniz.",
        ],
      },
      {
        heading: "8. Sona erme",
        paragraphs: [
          "Finely'yi istediğiniz zaman kullanmayı bırakabilirsiniz. Şirket sahibi, şirketi ve verilerini Ayarlar'dan silebilir; siz de hesabınızın silinmesini bizden isteyebilirsiniz. Bu şartları ihlal ederseniz veya Finely'yi sunmayı bırakırsak erişiminizi sonlandırabilir veya askıya alabiliriz; makul ölçüde mümkün olduğunda, verilerinizi dışa aktarabilmeniz için sizi önceden uyarırız.",
        ],
      },
      {
        heading: "9. Sorumluluğumuz",
        paragraphs: [
          "Finely olduğu gibi sunulur. Yasaların izin verdiği ölçüde; kâr kaybı, iş kaybı veya Finely'de gösterilen rakamlara dayanarak alınan kararlar gibi dolaylı kayıplardan sorumlu değiliz. Bu şartlardaki hiçbir hüküm, yasa gereği sınırlandırılamayan sorumluluğu sınırlamaz.",
        ],
      },
      {
        heading: "10. Bu şartlardaki değişiklikler",
        paragraphs: [
          "Bu şartları değiştirirsek bu sayfayı ve tarihini güncelleriz; önemli bir değişiklik yürürlüğe girmeden önce size e-postayla veya uygulama içinde haber veririz. Bundan sonra Finely'yi kullanmaya devam etmeniz yeni şartları kabul ettiğiniz anlamına gelir.",
        ],
      },
      {
        heading: "11. İletişim",
        paragraphs: ["Bu şartlarla ilgili sorularınız mı var? <contact>Bize bir mesaj gönderin</contact>."],
      },
    ] as PageSection[],
  },
  privacy: {
    title: "Gizlilik politikası",
    metaDescription:
      "Finely neleri topluyor, neden topluyor, başka kimler işliyor ve hangi seçenekleriniz var.",
    intro:
      "Finely şirketinizin finansal kayıtlarını tutar; bu yüzden neleri topladığımızı, bunlarla ne yaptığımızı ve ne yapmadığımızı açıkça anlatıyoruz.",
    sections: [
      {
        heading: "Bu politika kimi kapsar",
        paragraphs: [
          "“Finely”, “biz” ve “bize” ifadeleri, bu web sitesini ve Finely uygulamasını işleten Finely, Inc.'i ifade eder. Bu politika her ikisini de kapsar. Bir şirket Finely'yi kullandığında, hangi finansal verilerin gireceğine ve ekibinden kimin bunları görebileceğine o şirket karar verir; biz bu verileri şirket adına işleriz.",
        ],
      },
      {
        heading: "Neleri topluyoruz",
        list: [
          "<b>Hesabınız.</b> Adınız, e-posta adresiniz, şifreniz ve Finely'yi kullandığınız dil. Şifre yalnızca karıştırılmış (hash'lenmiş) biçimde saklanır, bu yüzden biz dahil hiç kimse onu okuyamaz. Google ile giriş yaparsanız şifre yerine Google'dan adınızı, e-posta adresinizi ve profil fotoğrafınızı alırız.",
          "<b>Şirketinizin verileri.</b> Sizin ve ekibinizin girdiği veya içe aktardığı her şey: şirketin adı ve saat dilimi, banka hesaplarının adları ile son dört hanesi ve bakiyeleri, işlemler, bunlara eklenen fişler ve faturalar, ödenecek faturalar, kategoriler, bütçeler ve kurallar, şirketin ödeme kartları (bir ad, son dört hane ve her birini kimin taşıdığı; asla tam numara değil) ve ekipte kimin hangi rolle bulunduğu.",
          "<b>Bankanızın verileri (banka bağlarsanız).</b> Bir sahip veya yönetici şirketin bankasını bağladığında, o bankanın hesap adlarını, hesap numaralarının son hanelerini, bakiyeleri ve işlemleri alır ve güncel tutarız. Bankanıza Plaid'in açtığı bir pencerede giriş yaparsınız; banka giriş bilgilerinizi asla görmez veya saklamayız ve para transferi yapamayız. Banka bağlantısı kesilene kadar bu verileri okumamızı sağlayan bir anahtarı şifrelenmiş olarak saklarız.",
          "<b>Değişiklik kaydı.</b> Bir şirkette kimin neyi ne zaman eklediği, değiştirdiği veya sildiği; böylece şirketin sahipleri ve yöneticileri bunu görebilir.",
          "<b>Oturumlarınız.</b> Her oturum için ne zaman başladığını, geldiği IP adresini ve tarayıcıyı saklarız. Canlı ortamda, şifre tahminlerini engellemek için her IP adresinden gelen giriş denemelerini de kısa bir süreliğine sayarız.",
          "<b>Bize gönderdiğiniz mesajlar.</b> İletişim formuna yazdıklarınız, adınız ve e-posta adresinizle birlikte. Formun kötüye kullanılmasını önlemek için bir IP adresinden kaç mesaj geldiğini bir saat boyunca sayarız.",
          "<b>Demoyu denemek.</b> “Demoyu dene”, sizin hakkınızda hiçbir şey sormadan hayali bir şirket ve hayali bir oturum oluşturur. Her oturum gibi, geldiği IP adresini ve tarayıcıyı saklar; bir IP adresinden kaç demo başlatıldığını da bir saat boyunca sayarız.",
        ],
      },
      {
        heading: "Bunları ne için kullanıyoruz",
        list: [
          "Size ve ekibinize şirketinizin finansal durumunu göstermek için.",
          "Uygulamanın gerektirdiği e-postaları göndermek için: adresinizi doğrulama, şifrenizi sıfırlama ve ekip davetleri.",
          "İsterseniz şirketinizin parasıyla ilgili size e-posta göndermek için: haftalık özet ve bir harcama olağandışı yüksek olduğunda uyarı. Bunlar yalnızca doğrulanmış adreslere gider ve her birini Ayarlar'dan kapatabilirsiniz.",
          "Hesapları güvende tutmak ve hataları bulup düzeltmek için.",
          "Bize yazdığınızda size yanıt vermek için.",
        ],
        after: [
          "Verilerinizi satmayız, reklam için kullanmayız ve siz yardım istemedikçe ya da yasa gerektirmedikçe şirketinizin finansal bilgilerine bakmayız.",
        ],
      },
      {
        heading: "Başka kimler işliyor",
        paragraphs: [
          "Finely'yi çalıştırmak için birkaç şirketten yararlanıyoruz. Her biri yalnızca kendi kısmı için gerekeni alır:",
        ],
        list: [
          "<b>Vercel</b> web sitesini ve uygulamayı barındırır.",
          "<b>Neon</b> hesapların ve şirket verilerinin saklandığı veritabanını barındırır.",
          "<b>Resend</b> e-postalarımızı iletir; bu yüzden alıcının adresini ve e-postanın içeriğini görür (haftalık özet ve uyarılarda içlerindeki rakamlar da buna dahildir).",
          "<b>Sentry</b> bir şey bozulduğunda rapor alır. Hiçbir kişisel veya finansal veri göndermeyecek şekilde ayarladık: çerez yok, form içeriği yok, veritabanı değeri yok.",
          "<b>Stripe</b>, yalnızca şirketiniz bir plan için ödeme yaparsa. Stripe ödemeyi kendi sayfalarında alır: kart numaralarını asla görmeyiz. Şirketin hangi planda olduğunu ve Stripe'ın müşteri ile abonelik kimliklerini saklarız.",
          "<b>Plaid</b>, yalnızca bir banka bağlarsanız. Plaid, ona verdiğiniz giriş bilgileriyle bankanıza bağlanır ve hesapları ile işlemleri bize iletir. Topladıkları için kendi gizlilik politikası geçerlidir.",
          "<b>Google</b>, yalnızca giriş için “Google ile devam et”i seçerseniz.",
        ],
        after: [
          "Şirketiniz içinde ekip arkadaşlarınız şirketin verilerini ve birbirlerinin adlarını, e-posta adreslerini ve rollerini görebilir.",
        ],
      },
      {
        heading: "Çerezler",
        paragraphs: [
          "Finely yalnızca oturumunuzu açık tutmak ve seçtiğiniz dili hatırlamak için gereken çerezleri kullanır. Reklam çerezi ve sizi internette takip eden analiz araçları yoktur.",
        ],
      },
      {
        heading: "Ne kadar süre saklıyoruz",
        paragraphs: [
          "Hesabınızı ve şirketinizin verilerini Finely'de var oldukları sürece saklarız. Şirket sahibi şirketi Ayarlar'dan silebilir; bu, şirketin hesaplarını, işlemlerini, ekli dosyalarını, faturalarını, kategorilerini, kurallarını, banka bağlantılarını ve değişiklik kaydını hemen kaldırır. Bir banka bağlantısını kesmek ona erişimimizi sona erdirir; daha önce içe aktarılanlar siz silene kadar kalır. Oturumlar kendiliğinden sona erer. Bir demo şirketi, hayali oturumu ve içine yazılan her şeyle birlikte, başlatıldıktan bir gün sonra silinir. Yedeklerdeki kopyalar, bu yedekler yenilendikçe ortadan kalkar.",
        ],
      },
      {
        heading: "Seçenekleriniz",
        paragraphs: [
          "Ayarlar'daki “Verileriniz” bölümünden hakkınızda tuttuğumuz bilgilerin bir kopyasını indirebilir ve hesabınızı kendiniz silebilirsiniz. Hesabı silmek profilinizi, oturumlarınızı ve her şirketteki yerinizi hemen kaldırır; bir şirket için girdikleriniz o şirkette kalır ve şirketin değişiklik kaydında yaptıklarınızın yanında adınız durur. Bir şirketin sahibiyseniz önce onu devredin veya silin. Yaşadığınız yere bağlı olarak yasalar size verilerinizin düzeltilmesini isteme, onları nasıl kullandığımıza itiraz etme veya veri koruma kurumunuza şikâyette bulunma gibi ek haklar tanıyabilir. Bunlar için ya da giriş yapamıyorsanız <contact>bize yazın</contact>. Veriler çalıştığınız bir şirkete aitse sizi o şirketin sahibine yönlendirebiliriz.",
        ],
      },
      {
        heading: "Güvenlik",
        paragraphs: [
          "Finely'ye yapılan bağlantılar şifrelenir, şifreler hash'lenerek saklanır ve şirket verilerine yönelik her istekte o şirkete ait olup olmadığınız kontrol edilir. Hiçbir sistem kusursuz derecede güvenli değildir; bu yüzden lütfen güçlü bir şifre kullanın ve başka birinin hesabınıza girdiğini düşünüyorsanız bize hemen haber verin.",
        ],
      },
      {
        heading: "Değişiklikler",
        paragraphs: [
          "Bu politikayı değiştirirsek bu sayfayı ve tarihini güncelleriz. Değişiklik verilerinizin nasıl kullanıldığını etkiliyorsa size önce e-postayla veya uygulama içinde haber veririz.",
        ],
      },
      {
        heading: "İletişim",
        paragraphs: [
          "Bu politika veya verileriniz hakkında sorularınız mı var? <contact>Bize bir mesaj gönderin</contact>. <terms>Hizmet şartlarımıza</terms> da göz atın.",
        ],
      },
    ] as PageSection[],
  },
  notFound: {
    title: "Sayfa bulunamadı",
    label: "Hata 404",
    heading: "Bu sayfa mevcut değil",
    intro: "Bağlantı eski veya hatalı yazılmış olabilir ya da sayfa taşınmış olabilir.",
    openDashboard: "Panelinizi açın",
    goHome: "Ana sayfaya git",
  },
  error: {
    title: "Bir şeyler ters gitti",
    text: "Bu durumdan haberdar edildik ve inceliyoruz. Lütfen birazdan tekrar deneyin.",
    tryAgain: "Tekrar dene",
    reference: "Referans: {digest}",
  },
  unsubscribe: {
    title: "Abonelikten çık",
    label: "E-posta bildirimleri",
    broken: "Bu bağlantı çalışmıyor",
    done: "Abonelikten çıktınız",
    brokenText:
      "Bağlantı eksik veya değiştirilmiş. E-postadaki bağlantıyı tekrar açın ya da e-postalarınızı <settings>Ayarlar → E-posta bildirimleri</settings> bölümünden seçin.",
    stopped: {
      weeklyDigest:
        "Bu şirket için artık haftalık özeti almayacaksınız. Fikrinizi mi değiştirdiniz? <settings>Ayarlar → E-posta bildirimleri</settings> bölümünden yeniden açın.",
      unusualCharges:
        "Bu şirket için artık olağandışı yüksek harcama uyarılarını almayacaksınız. Fikrinizi mi değiştirdiniz? <settings>Ayarlar → E-posta bildirimleri</settings> bölümünden yeniden açın.",
    },
    question: {
      weeklyDigest:
        "Bu şirket için haftalık özet durdurulsun mu? Finely'den gelen diğer e-postalarınız olduğu gibi kalır.",
      unusualCharges:
        "Bu şirket için olağandışı yüksek harcama uyarıları durdurulsun mu? Finely'den gelen diğer e-postalarınız olduğu gibi kalır.",
    },
  },
  yourAccount: {
    title: "Hesabınız",
    signedInAs: "{email} olarak giriş yapıldı.",
    backToFinely: "Finely'ye dön",
  },
};
