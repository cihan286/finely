import type { cards as en } from "../en/cards";

export const cards: typeof en = {
  title: "Kartlar",
  subtitle: "{company} şirketinin ödeme kartları ve her birinin {month} ayındaki harcaması.",
  add: "Kart ekle",
  empty: "Henüz kart yok.",
  emptyManage:
    "Kimin ne harcadığını görmek için bankanızın verdiği kartları ekleyin. Finely'nin yalnızca bir ada ve son dört haneye ihtiyacı var.",
  emptyMember: "Şirketinizin ödeme kartlarını buraya bir sahip veya yönetici ekleyebilir.",
  archived: "Arşivlendi",
  endingIn: "Son dört hanesi {last4}",
  shared: "Ortak kart",
  spentOf: "{spent} / {limit}",
  noLimit: "Limit yok",
  overLimit: "Limit {amount} aşıldı",
  left: "{amount} kaldı",
  limitUsed: "{name} limitinin kullanılan kısmı",
  noPayments: "{month} ayında ödeme yok",
  payments: { one: "{month} ayında 1 ödeme", other: "{month} ayında {count} ödeme" },
  viewPayments: "Ödemeleri gör",
  viewPaymentsLabel: "{name} ödemelerini gör",
  editLabel: "{name} kartını düzenle",
  dialog: {
    editTitle: "Kartı düzenle",
    confirmDelete:
      "Bu kart silinsin mi? Bu kartla ödenen işlemler kartsız olarak kalır. Bu geri alınamaz.",
    name: "Ad",
    namePlaceholder: "ör. Pazarlama kartı",
    lastFour: "Son dört hane",
    lastFourHint:
      "Finely asla kartın tam numarasını istemez. Banka dökümleri kartları bu hanelerle belirtir; ödemeleri de böyle tanınır.",
    exactlyFour: "Tam olarak 4 rakam",
    carriedBy: "Kartı taşıyan",
    sharedNobody: "Ortak (belirli bir kişi yok)",
    limit: "Aylık limit ({currency})",
    limitHint: "Limite ulaşıldığında Finely uyarır; kartı durduramaz.",
    useAgain: "Yeniden kullan",
    archive: "Arşivle",
    saveChanges: "Değişiklikleri kaydet",
  },
};
