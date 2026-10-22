// ─────────────────────────────────────────────────────────────────────────────
// What the Ctrl+K window offers, and finding it by what's typed
//
// In plain words: every page, every part of Settings and the things you
// can start from anywhere ("Add a transaction"), each with the address it
// opens. Only what the person's role allows is offered. Typing narrows the
// list: every word typed must appear, in any order, ignoring upper/lower
// case and Turkish letters ("sube" finds "Şubeler").
//
// For developers: pure functions, tested in commands.test.ts. The window
// itself is CommandPalette.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClientMessages } from "@/i18n/messages";

export type CommandGroup = "pages" | "settings" | "actions";

export interface Command {
  id: string;
  group: CommandGroup;
  label: string;
  href: string;
}

/** What the person may do, as far as the commands go */
export interface CommandPermissions {
  canRecord: boolean;
  canManage: boolean;
  canSeeActivity: boolean;
}

type Words = ClientMessages["shell"];

/** Every command the person may use, pages first */
export function buildCommands(
  { canRecord, canManage, canSeeActivity }: CommandPermissions,
  words: Words,
): Command[] {
  const nav = words.nav;
  const p = words.palette;
  const page = (id: keyof typeof nav, href: string): Command => ({
    id: `page:${id}`,
    group: "pages",
    label: nav[id],
    href,
  });
  const setting = (id: keyof typeof p.settings, href: string): Command => ({
    id: `settings:${id}`,
    group: "settings",
    label: p.settings[id],
    href,
  });
  const action = (id: keyof typeof p.actions, href: string): Command => ({
    id: `action:${id}`,
    group: "actions",
    label: p.actions[id],
    href,
  });
  return [
    page("dashboard", "/dashboard"),
    page("transactions", "/dashboard/transactions"),
    page("bills", "/dashboard/bills"),
    page("cards", "/dashboard/cards"),
    page("insights", "/dashboard/insights"),
    page("settings", "/dashboard/settings"),
    setting("details", "/dashboard/settings#details"),
    setting("branches", "/dashboard/settings#branches"),
    setting("team", "/dashboard/settings#team"),
    setting("accounts", "/dashboard/settings#accounts"),
    setting("categories", "/dashboard/settings#categories"),
    setting("rules", "/dashboard/settings#rules"),
    setting("emails", "/dashboard/settings#emails"),
    setting("you", "/dashboard/settings#you"),
    ...(canSeeActivity ? [setting("activity", "/dashboard/settings/activity")] : []),
    ...(canRecord
      ? [
          action("addTransaction", "/dashboard/transactions?new=1"),
          action("importStatement", "/dashboard/transactions?import=1"),
          action("addBill", "/dashboard/bills?new=1"),
        ]
      : []),
    ...(canManage ? [action("addCard", "/dashboard/cards?new=1")] : []),
  ];
}

// "Şubeler" → "subeler", "İçe" → "ice": no accents, dotted and dotless i alike
function simplify(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** The commands whose label has every word typed, in their order */
export function findCommands(commands: Command[], query: string): Command[] {
  const words = simplify(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands;
  return commands.filter((command) => {
    const label = simplify(command.label);
    return words.every((word) => label.includes(word));
  });
}
