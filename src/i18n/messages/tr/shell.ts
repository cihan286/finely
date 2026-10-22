import type { shell as en } from "../en/shell";

export const shell: typeof en = {
  nav: {
    dashboard: "Panel",
    transactions: "İşlemler",
    bills: "Faturalar",
    cards: "Kartlar",
    insights: "İçgörüler",
    settings: "Ayarlar",
    loggingOut: "Çıkış yapılıyor",
  },
  topBar: {
    searchPlaceholder: "Açıklama, not, kategori, hesap veya tutara göre arayın…",
    searchLabel: "İşlemlerde ara",
    notifications: "Bildirimler",
    notificationsUnread: "Bildirimler, {count} okunmamış",
    markAllRead: "Tümünü okundu say",
    nothing: "Şu anda ilgilenmeniz gereken bir şey yok.",
  },
  switcher: {
    label: "Şirket: {name}. Şirket değiştir",
    yourCompanies: "Şirketleriniz",
    newCompany: "Yeni şirket",
  },
  demo: {
    exploring: "Bir demoyu inceliyorsunuz.",
    long: "Northpeak Studio ve parası hayalidir ve bu kopyayı yalnızca siz görebilirsiniz: istediğiniz her şeyi değiştirin. {lifetime} içinde silinecek.",
    short: "Hayali veriler, {lifetime} içinde silinecek.",
    lessThanHour: "bir saatten kısa süre",
    hours: { one: "1 saat", other: "{count} saat" },
    signUp: "Gerçekten kaydol",
    leaving: "Demodan çıkılıyor",
  },
  palette: {
    title: "Git",
    placeholder: "Bir sayfa, ayar veya işlem bulmak için yazın…",
    noResults: "“{query}” ile eşleşen bir şey yok.",
    hint: "Seçmek için ↑ ↓, açmak için Enter, kapatmak için Esc",
    groups: { pages: "Sayfalar", settings: "Ayarlar", actions: "İşlemler" },
    settings: {
      details: "Şirket bilgileri",
      branches: "Şubeler",
      team: "Ekip ve roller",
      accounts: "Banka hesapları",
      categories: "Kategoriler ve bütçeler",
      rules: "Kategori kuralları",
      emails: "E-posta bildirimleri",
      you: "Hesabınız",
      activity: "Etkinlik kaydı",
    },
    actions: {
      addTransaction: "İşlem ekle",
      importStatement: "Banka ekstresi içe aktar",
      addBill: "Fatura ekle",
      addCard: "Kart ekle",
    },
  },
  verify: {
    please: "Lütfen e-posta adresinizi doğrulayın.",
    sentTo: "<b>{email}</b> adresine bir bağlantı gönderdik.",
  },
};
