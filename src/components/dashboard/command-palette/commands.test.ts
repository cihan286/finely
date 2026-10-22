import { expect, test } from "vitest";
import { messagesFor } from "@/i18n/messages";
import { buildCommands, findCommands } from "./commands";

const en = messagesFor("en").shell;
const tr = messagesFor("tr").shell;
const everything = { canRecord: true, canManage: true, canSeeActivity: true };

test("only what the role allows is offered", () => {
  const ids = (permissions: typeof everything) =>
    buildCommands(permissions, en).map((c) => c.id);
  const viewer = ids({ canRecord: false, canManage: false, canSeeActivity: false });
  expect(viewer).not.toContain("action:addTransaction");
  expect(viewer).not.toContain("action:addCard");
  expect(viewer).not.toContain("settings:activity");
  expect(viewer).toContain("page:transactions");

  const member = ids({ canRecord: true, canManage: false, canSeeActivity: false });
  expect(member).toContain("action:addTransaction");
  expect(member).not.toContain("action:addCard");

  expect(ids(everything)).toContain("settings:activity");
});

test("every word typed must appear, ignoring case and Turkish letters", () => {
  const commands = buildCommands(everything, tr);
  const labels = (query: string) => findCommands(commands, query).map((c) => c.label);
  expect(labels("sube")).toEqual(["Şubeler"]);
  expect(labels("IŞLEM EKLE")).toEqual(["İşlem ekle"]);
  expect(labels("ekle işlem")).toEqual(["İşlem ekle"]);
  expect(labels("  ")).toHaveLength(commands.length);
  expect(labels("nothing like this")).toEqual([]);

  const english = buildCommands(everything, en);
  expect(findCommands(english, "bank").map((c) => c.label)).toEqual([
    "Bank accounts",
    "Import a bank statement",
  ]);
});

test("each command opens its own address", () => {
  const hrefs = buildCommands(everything, en).map((c) => c.href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(hrefs.every((href) => href.startsWith("/dashboard"))).toBe(true);
});
