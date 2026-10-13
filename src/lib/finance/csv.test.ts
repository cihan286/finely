import { describe, expect, test } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  test("splits lines and cells", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("handles quoted cells with separators, quotes and line breaks", () => {
    expect(parseCsv('"x, y","he said ""hi""","multi\nline"')).toEqual([
      ["x, y", 'he said "hi"', "multi\nline"],
    ]);
  });

  test("handles Windows line endings, empty lines and a byte order mark", () => {
    expect(parseCsv("﻿a,b\r\n\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("keeps empty cells, trims spaces", () => {
    expect(parseCsv(" a , ,c,")).toEqual([["a", "", "c", ""]]);
  });

  test("uses the detected separator", () => {
    expect(parseCsv("a;b\n1,5;2")).toEqual([
      ["a", "b"],
      ["1,5", "2"],
    ]);
  });
});

describe("detectDelimiter", () => {
  test.each([
    ["Date,Text,Amount", ","],
    ['Date;Text;"Amount, EUR"', ";"],
    ["Date\tText\tAmount", "\t"],
    ["single column", ","],
  ])("%j -> %j", (line, expected) => {
    expect(detectDelimiter(`${line}\n1,2;3\t4`)).toBe(expected);
  });
});

describe("toCsv", () => {
  test("writes rows and cells, quoting what needs it", () => {
    expect(toCsv([["Date", "Description"], ["2026-10-13", 'Smith, "Bob"\nLtd']])).toBe(
      '\ufeffDate,Description\r\n2026-10-13,"Smith, ""Bob""\nLtd"\r\n',
    );
  });

  test("what it writes can be read back", () => {
    const rows = [
      ["Name", "Amount"],
      ['Caf\u00e9 "Lux", Paris', "-12.50"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  test("makes text that looks like a formula harmless, but leaves numbers alone", () => {
    expect(toCsv([["=SUM(A1:A9)", "+1 555 0100", "@home", "-12.50", "-", 42, "12.5%"]])).toBe(
      "\ufeff'=SUM(A1:A9),'+1 555 0100,'@home,-12.50,'-,42,12.5%\r\n",
    );
  });
});
