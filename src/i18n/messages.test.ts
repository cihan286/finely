import { describe, expect, test } from "vitest";
import { fill, localeFromAcceptLanguage, plural } from "./config";
import { messagesFor } from "./messages";

// Every string of a dictionary, by its path ("transactions.dialog.title")
function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => strings(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      strings(item, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

// What a sentence must keep in every language: its {placeholders} and <tags>
const markers = (text: string) =>
  [...(text.match(/\{\w+\}/g) ?? []), ...(text.match(/<\/?\w+>/g) ?? [])].sort();

describe("the Turkish words", () => {
  const en = new Map(strings(messagesFor("en")));
  const tr = new Map(strings(messagesFor("tr")));

  test("cover every English sentence, and nothing else", () => {
    expect([...tr.keys()].sort()).toEqual([...en.keys()].sort());
  });

  test("keep each sentence's placeholders and tags", () => {
    const different = [...en].filter(
      ([path, text]) => JSON.stringify(markers(text)) !== JSON.stringify(markers(tr.get(path) ?? "")),
    );
    expect(different.map(([path]) => path)).toEqual([]);
  });

  test("are all filled in", () => {
    // Legitimately the same in both: brand names, examples, formats
    const empty = [...tr].filter(([, text]) => text.trim() === "");
    expect(empty.map(([path]) => path)).toEqual([]);
  });
});

describe("the language of a request", () => {
  test("follows the browser's preference, if Finely speaks it", () => {
    expect(localeFromAcceptLanguage("tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9,tr;q=0.5")).toBe("tr");
    expect(localeFromAcceptLanguage("en-GB")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("en");
  });
});

test("fill and plural", () => {
  expect(fill("Due in {days} days", { days: 3 })).toBe("Due in 3 days");
  expect(fill("{missing} stays", {})).toBe("{missing} stays");
  const bills = messagesFor("en").bills.billCount;
  expect(plural(1, bills)).toBe("1 bill");
  expect(plural(4, bills)).toBe("4 bills");
  expect(plural(4, messagesFor("tr").bills.billCount)).toBe("4 fatura");
});
