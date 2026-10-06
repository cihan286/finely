import { describe, expect, test } from "vitest";
import { parseCsv } from "@/utils/csv";
import {
  columnLetter,
  detectDateFormat,
  duplicateKey,
  guessMapping,
  interpretRows,
  parseStatementAmount,
  parseStatementDate,
  removeExisting,
} from "./statement-import";

describe("parseStatementAmount", () => {
  test.each([
    ["-1,234.56", -1234.56],
    ["1.234,56", 1234.56],
    ["1,234,567.8", 1234567.8],
    ["(45.00)", -45],
    ["45.00-", -45],
    ["$12", 12],
    ["-$1,234.56", -1234.56],
    ["USD -7.10", -7.1],
    ["1'234.50 CHF", 1234.5],
    ["1 234,00 €", 1234],
    ["1,234", 1234],
    ["1.234", 1234],
    ["0,5", 0.5],
    ["0.99", 0.99],
  ])("%j -> %d", (text, expected) => {
    expect(parseStatementAmount(text)).toBe(expected);
  });

  test.each(["", "abc", "12.3.4", "1,23,456", ".5"])("%j isn't an amount", (text) => {
    expect(parseStatementAmount(text)).toBeNull();
  });
});

describe("parseStatementDate", () => {
  test.each([
    ["2026-10-31", "YMD", "2026-10-31"],
    ["2026/10/31", "YMD", "2026-10-31"],
    ["10/31/2026", "MDY", "2026-10-31"],
    ["31.10.2026", "DMY", "2026-10-31"],
    ["31/10/26", "DMY", "2026-10-31"],
    ["2026-10-31T14:02:00", "YMD", "2026-10-31"],
    ["2026-10-31 14:02", "YMD", "2026-10-31"],
  ] as const)("%j as %s -> %s", (text, format, expected) => {
    expect(parseStatementDate(text, format)).toBe(expected);
  });

  test.each([
    ["02/30/2026", "MDY"], // no February 30
    ["31/10/2026", "MDY"], // no month 31
    ["Date", "YMD"],
    ["2026-10", "YMD"],
  ] as const)("%j as %s is not a date", (text, format) => {
    expect(parseStatementDate(text, format)).toBeNull();
  });
});

describe("detectDateFormat", () => {
  test("picks the first format every value fits", () => {
    expect(detectDateFormat(["03/04/2026", "04/13/2026"])).toBe("MDY");
    expect(detectDateFormat(["03/04/2026", "13/04/2026"])).toBe("DMY");
    expect(detectDateFormat(["2026-04-13", ""])).toBe("YMD");
  });

  test("null when nothing fits", () => {
    expect(detectDateFormat(["Groceries"])).toBeNull();
    expect(detectDateFormat([])).toBeNull();
  });
});

test("columnLetter", () => {
  expect(columnLetter(0)).toBe("Column A");
  expect(columnLetter(25)).toBe("Column Z");
  expect(columnLetter(26)).toBe("Column AA");
});

describe("guessMapping + interpretRows", () => {
  test("US export: one amount column, header, unusable lines explained", () => {
    const rows = parseCsv(
      [
        "Posting Date,Description,Amount,Type,Balance",
        "10/01/2026,STRIPE TRANSFER   ST-ABC,2400.00,ACH_CREDIT,84230.50",
        '09/30/2026,"GUSTO PAYROLL, INC",-8204.00,ACH_DEBIT,81830.50',
        "09/29/2026,Interest,0.00,FEE,90034.50",
        "13/45/2026,Broken,-5,X,0",
      ].join("\n"),
    );
    const mapping = guessMapping(rows);
    expect(mapping).toMatchObject({
      hasHeader: true,
      date: 0,
      dateFormat: "MDY",
      name: 1,
      amountMode: "single",
      amount: 2,
    });

    const result = interpretRows(rows, mapping);
    expect(result.rows).toEqual([
      { date: "2026-10-01", name: "STRIPE TRANSFER ST-ABC", amount: 2400, category: null },
      { date: "2026-09-30", name: "GUSTO PAYROLL, INC", amount: -8204, category: null },
    ]);
    expect(result.problems).toEqual([
      { line: 4, message: "The amount is zero." },
      { line: 5, message: "“13/45/2026” isn't a date in the chosen format." },
    ]);
  });

  test("European export: separate money in/out columns, categories", () => {
    const rows = parseCsv(
      [
        "Buchungsdatum;Text;Ausgang;Eingang;Kategorie",
        "31.10.2026;Miete Büro;1.200,00;;Office & Rent",
        "30.10.2026;Kunde AG;;3.450,50;Sales",
      ].join("\n"),
    );
    const mapping = guessMapping(rows);
    expect(mapping).toMatchObject({
      date: 0,
      dateFormat: "DMY",
      name: 1,
      amountMode: "split",
      moneyOut: 2,
      moneyIn: 3,
      category: 4,
    });
    expect(interpretRows(rows, mapping).rows).toEqual([
      { date: "2026-10-31", name: "Miete Büro", amount: -1200, category: "Office & Rent" },
      { date: "2026-10-30", name: "Kunde AG", amount: 3450.5, category: "Sales" },
    ]);
  });

  test("no header row: columns guessed from their contents", () => {
    const rows = parseCsv("2026-10-01,Coffee shop,-4.50\n2026-10-02,Client payment,500");
    const mapping = guessMapping(rows);
    expect(mapping).toMatchObject({ hasHeader: false, date: 0, name: 1, amount: 2 });
    expect(interpretRows(rows, mapping).rows).toHaveLength(2);
  });

  test("flipSign turns positive spending into money out", () => {
    const rows = parseCsv("2026-10-01,Coffee shop,4.50");
    const mapping = { ...guessMapping(rows), flipSign: true };
    expect(interpretRows(rows, mapping).rows[0].amount).toBe(-4.5);
  });

  test("long descriptions are shortened to 120 characters", () => {
    const rows = parseCsv(`2026-10-01,${"x".repeat(200)},-1`);
    expect(interpretRows(rows, guessMapping(rows)).rows[0].name).toHaveLength(120);
  });
});

describe("removeExisting", () => {
  const key = (r: { day: string; amount: number; name: string }) =>
    duplicateKey(r.day, r.amount, r.name);
  const coffee = { day: "2026-10-01", amount: -4.5, name: "Coffee" };
  const rent = { day: "2026-10-01", amount: -1200, name: "Rent" };

  test("drops lines that are already there, ignoring case", () => {
    const existing = [duplicateKey("2026-10-01", -1200, "RENT")];
    expect(removeExisting([coffee, rent], existing, key)).toEqual([coffee]);
  });

  test("identical lines: only as many are dropped as already exist", () => {
    const existing = [key(coffee)];
    expect(removeExisting([coffee, coffee, coffee], existing, key)).toEqual([coffee, coffee]);
  });

  test("a different day or amount is a different transaction", () => {
    const existing = [duplicateKey("2026-10-02", -4.5, "Coffee"), duplicateKey("2026-10-01", -4.75, "Coffee")];
    expect(removeExisting([coffee], existing, key)).toEqual([coffee]);
  });
});
