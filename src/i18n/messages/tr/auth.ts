import type {
  auth as enAuth,
  roles as enRoles,
  rolesInSentence as enRolesInSentence,
} from "../en/auth";

export const auth: typeof enAuth = {
  emailLabel: "E-posta",
  emailPlaceholder: "siz@sirketiniz.com",
  passwordLabel: "Şifre",
  atLeastCharacters: "En az {min} karakter.",
  or: "veya",
  login: {
    title: "Giriş yap",
    heading: "Tekrar hoş geldiniz",
    subtitle: "Finely hesabınıza giriş yapın.",
    passwordChanged: "Şifreniz değiştirildi. Yeni şifrenizle giriş yapın.",
    accountDeleted: "Hesabınız silindi. Finely'yi denediğiniz için teşekkürler.",
    newToFinely: "Finely'de yeni misiniz?",
    createAccount: "Hesap oluşturun",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    loggingIn: "Giriş yapılıyor",
    failed: "Giriş yapılamadı. Lütfen tekrar deneyin.",
    continueWithGoogle: "Google ile devam et",
  },
  signup: {
    title: "Hesabınızı oluşturun",
    subtitle: "İşletmenizin finansal durumunu dakikalar içinde net bir şekilde görün.",
    haveAccount: "Zaten bir hesabınız var mı?",
    agree:
      "Bir hesap oluşturarak <terms>Hizmet şartlarımızı</terms> ve <privacy>Gizlilik politikamızı</privacy> kabul etmiş olursunuz.",
    fullName: "Ad soyad",
    workEmail: "İş e-postası",
    namePlaceholder: "Ayşe Yılmaz",
    create: "Hesap oluştur",
    creating: "Hesap oluşturuluyor",
    failed: "Hesabınız oluşturulamadı. Lütfen tekrar deneyin.",
    withGoogle: "Google ile kaydol",
  },
  google: {
    redirecting: "Google'a yönlendiriliyor",
    failed: "Google'a bağlanılamadı. Lütfen tekrar deneyin.",
  },
  forgot: {
    title: "Şifrenizi sıfırlayın",
    heading: "Şifrenizi mi unuttunuz?",
    subtitle: "E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.",
    remembered: "Hatırladınız mı?",
    backToLogin: "Girişe dön",
    sent: "Bu e-postaya ait bir hesap varsa şifrenizi sıfırlamanız için bir bağlantı gönderdik. Bağlantı bir saat içinde geçerliliğini yitirir.",
    send: "Sıfırlama bağlantısı gönder",
    sending: "Gönderiliyor",
  },
  reset: {
    title: "Yeni bir şifre belirleyin",
    subtitle: "Bundan sonra giriş yapmak için bunu kullanacaksınız.",
    expiredTitle: "Bağlantının süresi doldu",
    expiredText:
      "Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Sıfırlama bağlantıları bir kez çalışır ve bir saat sonra geçerliliğini yitirir.",
    requestNew: "Yeni bağlantı iste",
    newPassword: "Yeni şifre",
    confirm: "Yeni şifreyi onaylayın",
    mismatch: "Şifreler eşleşmiyor.",
    invalid: "Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.",
    set: "Yeni şifreyi kaydet",
  },
  onboarding: {
    title: "Şirketinizi kurun",
    addTitle: "Şirket ekle",
    addSubtitle:
      "Sahibi siz olacaksınız. Kendi ekibi, hesapları ve işlemleriyle boş olarak başlar.",
    backTo: "{name} şirketine dön",
    welcome: "Hoş geldiniz, {name}! Şirketinizin adı ne?",
    joining:
      "Finely'yi zaten kullanan bir şirkete mi katılıyorsunuz? Oradan birinden {email} adresini davet etmesini isteyin.",
    yourAccount: "Adınız, verileriniz ve hesabınızı silme",
    companyName: "Şirket adı",
    companyHint: "Kurulum bittikten sonra ekibinizi davet edebilirsiniz.",
    companyPlaceholder: "Kuzey Tasarım Stüdyosu",
    continue: "Devam et",
    settingUp: "Kuruluyor",
    failed: "Şirketiniz oluşturulamadı. Lütfen tekrar deneyin.",
    opening: "Şirketiniz açılıyor",
    openFailed: "Şirketinizi açamadık. Tekrar denemek için lütfen sayfayı yenileyin.",
  },
  invitation: {
    title: "Ekibinize katılın",
    invited: "Davet edildiniz",
    invitedText:
      "Finely'de ekibinize katılmak için giriş yapın veya bir hesap oluşturun. Davetin gönderildiği e-posta adresini kullanın.",
    verifyTitle: "Ekibinize katılmak için e-postanızı doğrulayın",
    verifyText:
      "<b>{email}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayın; daveti kabul etmek için hemen buraya geri döneceksiniz.",
    didntGetIt: "Ulaşmadı mı?",
    unavailable: "Davet kullanılamıyor",
    unavailableText:
      "Bu davetin süresi dolmuş, daha önce kullanılmış ya da farklı bir e-posta adresine gönderilmiş. <b>{email}</b> olarak giriş yaptınız.",
    goToDashboard: "Panele git",
    join: "{company} şirketine katılın",
    joinText: "{inviter} sizi Finely'de {company} şirketine {role} olarak katılmaya davet etti.",
    accept: "Daveti kabul et",
    joining: "Katılım sağlanıyor",
    decline: "Reddet",
    declining: "Reddediliyor",
    switchAccount: "Başka bir hesap kullan",
  },
  resend: {
    resend: "E-postayı tekrar gönder",
    sending: "Gönderiliyor",
    sent: "Gönderildi! Gelen kutunuzu kontrol edin.",
    failed: "Gönderilemedi. Tekrar deneyin",
  },
  roleWithArticle: {
    owner: "sahip",
    admin: "yönetici",
    member: "üye",
  },
  errors: {
    INVALID_EMAIL_OR_PASSWORD: "E-posta veya şifre hatalı.",
    INVALID_EMAIL: "Lütfen geçerli bir e-posta adresi girin.",
    INVALID_PASSWORD: "Şifre doğru değil.",
    PASSWORD_TOO_SHORT: "Şifre çok kısa.",
    PASSWORD_TOO_LONG: "Şifre çok uzun.",
    USER_ALREADY_EXISTS: "Bu e-postaya ait bir hesap zaten var. Bunun yerine giriş yapın.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
      "Bu e-postaya ait bir hesap zaten var. Başka bir e-posta kullanın.",
    INVALID_TOKEN: "Bu bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.",
    TOKEN_EXPIRED: "Bu bağlantının süresi dolmuş. Lütfen yeni bir bağlantı isteyin.",
    EMAIL_NOT_VERIFIED: "Lütfen önce e-posta adresinizi doğrulayın.",
    SESSION_EXPIRED: "Güvenliğiniz için lütfen tekrar giriş yapıp yeniden deneyin.",
    EMAIL_CAN_NOT_BE_UPDATED: "Bu e-posta adresi değiştirilemez.",
    USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Bu kişi zaten ekipte.",
    USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "Bu kişi zaten davet edildi.",
    ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
      "Şirketin mevcut planında ekip dolu. Daha fazla kişi eklemek için planı yükseltin.",
    INVITATION_NOT_FOUND: "Bu davet artık geçerli değil.",
    YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "Bu davet farklı bir e-posta adresine gönderilmiş.",
    EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
      "Daveti yanıtlamadan önce lütfen e-posta adresinizi doğrulayın.",
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
      "Tek sahip olarak ayrılmadan önce şirketi başka birine devredin.",
    YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
      "Yalnızca sahipler ve yöneticiler kişi davet edebilir.",
    YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
      "Şirketi yalnızca sahipler ve yöneticiler değiştirebilir.",
    YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "Bu kişiyi çıkaramazsınız.",
    YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "Bu kişinin rolünü değiştiremezsiniz.",
    TOO_MANY_REQUESTS: "Çok fazla deneme yapıldı. Lütfen bir dakika bekleyip tekrar deneyin.",
  },
  demoBlocked:
    "Bu özellik demoda kullanılamaz. Kendi şirketinizle kullanmak için kaydolun.",
};

export const roles: typeof enRoles = {
  owner: "Sahip",
  admin: "Yönetici",
  member: "Üye",
};

export const rolesInSentence: typeof enRolesInSentence = {
  owner: "sahip",
  admin: "yönetici",
  member: "üye",
};
