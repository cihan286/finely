import { describe, expect, test } from "vitest";
import { messagesFor } from "@/i18n/messages";
import { hasChanges, renderAudit, type AuditChange } from "./audit";

const en = messagesFor("en");
const tr = messagesFor("tr");

const changes: AuditChange[] = [
  {
    field: "amount",
    before: { money: 500, currency: "USD" },
    after: { money: 550, currency: "USD" },
  },
  { field: "date", before: { day: "2026-10-01" }, after: { day: "2026-10-01" } },
  { field: "category", before: null, after: "Rent" },
  { field: "notes", before: "Paid late", after: "" },
];

describe("renderAudit", () => {
  test("lists only what changed", () => {
    expect(
      renderAudit({ key: "billChanged", values: { name: "Office rent", changes: { changes } } }, en, "en"),
    ).toBe(
      "Changed the bill “Office rent”: amount from $500.00 to $550.00, category from none to Rent, notes from Paid late to none",
    );
  });

  test("in the reader's language, with their number and date formats", () => {
    expect(
      renderAudit({ key: "billChanged", values: { name: "Ofis kirası", changes: { changes } } }, tr, "tr"),
    ).toBe("“Ofis kirası” faturasını değiştirdi: tutar: $500,00 → $550,00, kategori: yok → Rent, notlar: Paid late → yok");
    expect(
      renderAudit(
        {
          key: "transactionDeleted",
          values: {
            name: "AWS",
            amount: { money: -340.12, currency: "EUR", signed: true },
            day: { day: "2026-10-08" },
          },
        },
        tr,
        "tr",
      ),
    ).toBe("“AWS” işlemini sildi (-€340,12, 8 Eki 2026)");
  });

  test("counts, roles and bank syncs", () => {
    expect(
      renderAudit({ key: "imported", values: { count: { count: 3, of: "transaction" } } }, en, "en"),
    ).toBe("Imported 3 transactions from a bank statement");
    expect(renderAudit({ key: "joined", values: { role: { role: "admin" } } }, tr, "tr")).toBe(
      "Şirkete yönetici olarak katıldı",
    );
    expect(
      renderAudit(
        {
          key: "bankSynced",
          values: { bank: "First Bank", sync: { sync: { newAccounts: 1, added: 3, updated: 0, removed: 2 } } },
        },
        en,
        "en",
      ),
    ).toBe("Synced First Bank: 1 new account, 3 transactions added, 2 removed");
  });
});

describe("hasChanges", () => {
  test("nothing changed: nothing to say", () => {
    expect(hasChanges([{ field: "amount", before: { money: 1, currency: "USD" }, after: { money: 1, currency: "USD" } }])).toBe(false);
    expect(hasChanges([{ field: "notes", before: null, after: "" }])).toBe(false);
    expect(hasChanges([{ moved: true }])).toBe(true);
    expect(hasChanges(changes)).toBe(true);
  });
});
