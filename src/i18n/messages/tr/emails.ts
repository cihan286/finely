import type { emails as en } from "../en/emails";

export const emails: typeof en = {
  hi: "Merhaba {name},",
  hiNoName: "Merhaba,",
  copyLink: "Düğme çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:",
  tagline: "Finely – Modern işletmeler için finansal netlik",
  passwordReset: {
    subject: "Finely şifrenizi sıfırlayın",
    preview: "Yeni bir şifre seçmek için bu bağlantıyı kullanın.",
    heading: "Şifrenizi sıfırlayın",
    body: "Finely hesabınızın şifresini sıfırlamak için bir istek aldık. Yeni bir şifre seçmek için aşağıdaki düğmeye tıklayın.",
    textBody:
      "Finely hesabınızın şifresini sıfırlamak için bir istek aldık. Yeni bir şifre seçmek için bu bağlantıyı açın:",
    button: "Yeni şifre seç",
    footnote:
      "Bu bağlantı bir kez çalışır ve bir saat içinde geçerliliğini yitirir. Şifrenizi sıfırlamak istemediyseniz bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
    textFootnote:
      "Bu bağlantı bir kez çalışır ve bir saat içinde geçerliliğini yitirir. Şifrenizi sıfırlamak istemediyseniz bu e-postayı yok sayabilirsiniz.",
  },
  verify: {
    subject: "Finely için e-postanızı doğrulayın",
    preview: "Bunun sizin e-posta adresiniz olduğunu onaylayın.",
    heading: "E-posta adresinizi doğrulayın",
    body: "Finely'ye hoş geldiniz! Lütfen bunun sizin e-posta adresiniz olduğunu onaylayın. Ekiplere katılmak için doğrulanmış bir e-postaya ihtiyacınız olacak.",
    textBody:
      "Finely'ye hoş geldiniz! Lütfen bu bağlantıyı açarak bunun sizin e-posta adresiniz olduğunu onaylayın:",
    button: "E-posta adresini doğrula",
    footnote:
      "Bu bağlantı bir saat içinde geçerliliğini yitirir. Finely hesabı oluşturmadıysanız bu e-postayı yok sayabilirsiniz.",
  },
  invitation: {
    subject: "{inviter} sizi Finely'de {company} şirketine katılmaya davet etti",
    preview: "Finely'de {company} şirketine katılın.",
    heading: "Finely'de {company} şirketine katılın",
    body: "<b>{inviter}</b> ({email}) sizi Finely'de <b>{company}</b> şirketine {role} olarak katılmaya davet etti.",
    about: "Finely, ekibinize şirketin nakit akışına, harcamalarına ve faturalarına tek ve net bir bakış sunar.",
    textAccept: "Daveti buradan kabul edin:",
    button: "Daveti kabul et",
    footnote:
      "Bu davetin süresi 48 saat içinde dolar. Beklemiyorsanız bu e-postayı yok sayabilirsiniz.",
  },
  ownership: {
    subject: "Artık Finely'de {company} şirketinin sahibisiniz",
    preview: "{owner}, {company} şirketini size devretti.",
    heading: "Artık {company} şirketinin sahibisiniz",
    body: "<b>{owner}</b>, Finely'de <b>{company}</b> şirketini size devretti. Artık yönetici.",
    owner: "Sahip olarak planı ve faturalandırmayı siz yönetirsiniz; şirketi devredebilecek veya silebilecek tek kişi sizsiniz.",
    button: "Ayarları aç",
    footnote: "Bunu beklemiyorsanız şirketi devreden kişiyle konuşun.",
  },
  companyDeleted: {
    subject: "{company} Finely'de silindi",
    preview: "{owner}, {company} şirketini sildi.",
    heading: "{company} silindi",
    body: "<b>{company}</b> şirketinin sahibi <b>{owner}</b>, şirketi Finely'de sildi. Hesapları, işlemleri, faturaları ve dosyaları silindi; giriş yaptığınızda artık görünmeyecek.",
    untouched:
      "Kendi Finely hesabınıza dokunulmadı: üyesi olduğunuz diğer şirketler hâlâ orada ve yeni bir şirket kurabilirsiniz.",
    button: "Finely'yi aç",
    footnote: "Bir şirketi silmek geri alınamaz.",
  },
  paymentFailed: {
    subject: "{company} şirketinin Finely planı için ödeme başarısız oldu",
    preview: "Planı korumak için ödeme yöntemini güncelleyin.",
    heading: "Bir ödeme başarısız oldu",
    body: "<b>{company}</b> şirketinin Finely planı için son ödeme gerçekleşmedi. Kartın süresi dolmuş veya kart reddedilmiş olabilir.",
    nothingChanges:
      "Hemen bir şey değişmez: önümüzdeki günlerde ödeme yeniden denenirken plan devam eder. Başarısız olmaya devam ederse şirket Ücretsiz plana geri döner. Kimse ekipten çıkarılmaz, ancak Ücretsiz planın sınırının ötesinde kimse eklenemez.",
    button: "Ödeme yöntemini güncelle",
    textUpdate: "Ödeme yöntemini “Faturalandırmayı yönet” bölümünden güncelleyin:",
    footnote: "Orada “Faturalandırmayı yönet”i açın. Bu e-postayı şirketin sahibi olduğunuz için alıyorsunuz.",
    owner: "Bu e-postayı şirketin sahibi olduğunuz için alıyorsunuz.",
  },
  planEnded: {
    subject: "{company} yeniden Finely'nin Ücretsiz planında",
    preview: "{plan} planı sona erdi.",
    heading: "{plan} planı sona erdi",
    body: "<b>{company}</b> şirketinin Finely'deki {plan} planı, iptal edildiği veya ödemesi başarısız olmaya devam ettiği için sona erdi. Şirket artık Ücretsiz planda.",
    nothingDeleted:
      "Hiçbir şey silinmedi ve kimse ekipten çıkarılmadı. Ücretsiz plan {members} kişiye kadar ekipler içindir; daha büyük bir ekip olduğu gibi kalır ama büyüyemez.",
    button: "Bir plan seç",
    owner: "Bu e-postayı şirketin sahibi olduğunuz için alıyorsunuz.",
  },
  accountDeleted: {
    subject: "Finely hesabınız silindi",
    preview: "Hesabınız ve oturumlarınız silindi.",
    heading: "Hesabınız silindi",
    body: "İstediğiniz gibi Finely hesabınız; oturumlarınız, e-posta tercihleriniz ve bulunduğunuz her şirketteki yerinizle birlikte silindi. Bu, bizden alacağınız son e-posta.",
    stays: "Bir şirket için girdikleriniz o şirkette kalır.",
    button: "Bize ulaşın",
    footnote: "Bunu siz yapmadıysanız hemen bize yazın.",
  },
  stoppable: {
    settings: "Bu e-postaları durdurmak için Finely'de Ayarlar → E-posta bildirimleri bölümünü açın.",
    unsubscribe: "Abonelikten çık",
    orChoose: "ya da e-postalarınızı Ayarlar → E-posta bildirimleri bölümünden seçin.",
    textUnsubscribe: "Abonelikten çık:",
    textChoose: "E-postalarınızı seçin:",
  },
  unusual: {
    line: "{name}, {day} tarihinde {amount} tahsil etti; olağan {usual} tutarının %{percent} üzerinde.",
    lineHtml:
      "<b>{name}</b>, {day} tarihinde <b>{amount}</b> tahsil etti; olağan {usual} tutarının %{percent} üzerinde.",
    headingOne: "{name} tarafından olağandışı yüksek harcama",
    headingMany: "{count} olağandışı yüksek harcama",
    subject: "{company}: {heading}",
    why: "Bu e-postayı Finely'de {company} ekibinde olduğunuz için alıyorsunuz.",
    introOne:
      "<b>{company}</b> şirketine az önce eklenen bir harcama, o tedarikçinin genelde tahsil ettiğinin çok üzerinde:",
    introMany:
      "<b>{company}</b> şirketine az önce eklenen bazı harcamalar, o tedarikçilerin genelde tahsil ettiğinin çok üzerinde:",
    textIntroOne: "{company} şirketine az önce eklenen bir harcama olağanın çok üzerinde:",
    textIntroMany: "{company} şirketine az önce eklenen bazı harcamalar olağanın çok üzerinde:",
    buttonOne: "İşlemi incele",
    buttonMany: "İşlemleri incele",
    textReview: "Finely'de inceleyin:",
  },
  digest: {
    moneyIn: "Para girişi",
    moneyOut: "Para çıkışı",
    net: "Net",
    inBank: "Şu an bankada",
    bills: { one: "1 fatura", other: "{count} fatura" },
    overdue: "{bills} vadesi geçmiş, toplam {amount}.",
    dueSoon: "{bills} önümüzdeki 7 gün içinde ödenecek, toplam {amount}.",
    overBudget: "{name}, bu ayki {budget} bütçesini {over} aştı.",
    unusual: "{name} {amount} tahsil etti; olağan {usual} tutarının %{percent} üzerinde.",
    why: "Bu e-postayı Finely'de {company} ekibinde olduğunuz için her hafta alıyorsunuz.",
    intro: "Merhaba {name}, işte <b>{company}</b> şirketinin haftası ({period}).",
    whereItWent: "Nereye gitti:",
    needsALook: "Bakılması gerekenler:",
    subject: "{company} şirketinin haftası: net {net}",
    preview: "Para girişi {in}, para çıkışı {out}.",
    heading: "Finely'de haftanız",
    button: "Paneli aç",
  },
};
