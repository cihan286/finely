import type { common as enCommon, meta as enMeta } from "../en/common";

export const common: typeof enCommon = {
  language: "Dil",
  optional: "(isteğe bağlı)",
  close: "Kapat",
  showPassword: "Şifreyi göster",
  hidePassword: "Şifreyi gizle",
  cancel: "Vazgeç",
  save: "Kaydet",
  saving: "Kaydediliyor",
  saved: "Kaydedildi.",
  delete: "Sil",
  deleting: "Siliniyor",
  edit: "Düzenle",
  add: "Ekle",
  adding: "Ekleniyor",
  none: "Yok",
  all: "Tümü",
  search: "Ara",
  loading: "Yükleniyor",
  back: "Geri",
  done: "Tamam",
  learnMore: "Daha fazla bilgi",
  logIn: "Giriş yap",
  logOut: "Çıkış yap",
  signUp: "Kaydol",
  startForFree: "Ücretsiz başla",
  openDashboard: "Panele git",
  home: "Finely ana sayfa",
  somethingWentWrong: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
  notice: {
    success: "Tamamlandı",
    error: "Bu işlem yapılamadı",
    info: "Bilginize",
    label: "Mesajlar",
  },
  confirm: {
    title: "Emin misiniz?",
    yes: "Evet, devam et",
  },
};

export const meta: typeof enMeta = {
  defaultTitle: "Finely – Modern işletmeler için finansal netlik",
  description:
    "Harcamalarınızı otomatik takip edin, nakit akışınızı anlık görün ve işletmenizin finansal verilerini net, uygulanabilir içgörülere dönüştürün.",
};
