import type { notifications as en } from "../en/notifications";

export const notifications: typeof en = {
  unusualTitle: "Olağandışı yüksek harcama",
  unusual: "{name} {amount} tahsil etti; olağan {usual} tutarının %{percent} üzerinde.",
  overdrawnTitle: "Hesap eksi bakiyede",
  overdrawn: "{name} bakiyesi {balance}.",
  shortfallTitle: "Nakit yetmeyebilir",
  shortfall:
    "Beklenen faturalar ve düzenli ödemelerle bakiyeniz {date} tarihine kadar {balance} seviyesine düşebilir.",
  overBudgetTitle: "Bütçe aşıldı",
  overBudget: "{name}, {month} ayı için {budget} bütçesini {over} aştı.",
  nearBudgetTitle: "Bütçe neredeyse tükendi",
  nearBudget: "{name}, {month} ayı için {budget} bütçesinin %{percent} kadarını kullandı: {left} kaldı.",
  cardTitle: "Kart limitini aştı",
  card: "{name} (•••• {last4}), {month} ayı için {limit} limitinin {spent} kadarını harcadı.",
  overdueTitle: { one: "Vadesi geçmiş fatura", other: "Vadesi geçmiş faturalar" },
  overdue: {
    one: "1 faturanın son ödeme tarihi geçti, toplam {amount}.",
    other: "{count} faturanın son ödeme tarihi geçti, toplam {amount}.",
  },
  dueSoonTitle: { one: "Yaklaşan fatura", other: "Yaklaşan faturalar" },
  dueSoon: {
    one: "1 faturanın son ödeme tarihi bir hafta içinde, toplam {amount}.",
    other: "{count} faturanın son ödeme tarihi bir hafta içinde, toplam {amount}.",
  },
  maybePaidTitle: { one: "Fatura zaten ödenmiş olabilir", other: "Faturalar zaten ödenmiş olabilir" },
  maybePaid: {
    one: "Ödenmemiş 1 faturanın tutarında bir ödeme işlemlerinizde var. O ödemeyse faturayı o ödemeyle ödendi olarak işaretleyin.",
    other:
      "Ödenmemiş {count} faturanın tutarında ödemeler işlemlerinizde var. O ödemelerse faturaları bu ödemelerle ödendi olarak işaretleyin.",
  },
  pendingTitle: "Hâlâ bekleyen ödemeler",
  pending: {
    one: "1 ödeme bir haftadan uzun süredir beklemede. Gerçekleştiğinde tamamlandı olarak işaretleyin.",
    other:
      "{count} ödeme bir haftadan uzun süredir beklemede. Gerçekleştiklerinde tamamlandı olarak işaretleyin.",
  },
  uncategorizedTitle: "Kategorisi olmayan işlemler",
  uncategorized: {
    one: "1 işlemin kategorisi yok, bu yüzden harcama dağılımlarında görünmüyor.",
    other: "{count} işlemin kategorisi yok, bu yüzden harcama dağılımlarında görünmüyorlar.",
  },
};
