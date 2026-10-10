import { describe, expect, test } from "vitest";
import { detectDelimiter, parseCsv } from "./csv";

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
