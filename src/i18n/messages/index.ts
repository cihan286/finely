// ─────────────────────────────────────────────────────────────────────────────
// Languages: the words
//
// In plain words: every sentence Finely shows, in English (en/) and in
// Turkish (tr/), grouped by the part of the app they belong to.
//
// For developers: en/ is the source; its shape is the Messages type, and
// tr/ must have exactly the same keys (TypeScript checks it, and
// messages.test.ts checks that the {placeholders} match). Values are plain
// strings, so they can be handed to client components; fill() and plural()
// in config.ts put numbers and names into them.
// ─────────────────────────────────────────────────────────────────────────────

import type { Locale } from "../config";
import { en } from "./en";
import { tr } from "./tr";

export type Messages = typeof en;

const messages: Record<Locale, Messages> = { en, tr };

/** The words of a language */
export function messagesFor(locale: Locale): Messages {
  return messages[locale];
}

/**
 * The parts the browser needs (client components). The rest — legal pages,
 * emails, the activity log's sentences, errors — is only used on the
 * server, so it isn't sent with every page.
 */
const CLIENT_PARTS = [
  "common",
  "home",
  "auth",
  "roles",
  "rolesInSentence",
  "shell",
  "dashboard",
  "transactions",
  "bills",
  "cards",
  "insights",
  "settings",
] as const satisfies readonly (keyof Messages)[];

export type ClientMessages = Pick<Messages, (typeof CLIENT_PARTS)[number]>;

/** A language's words, cut down to what client components use */
export function clientMessages(m: Messages): ClientMessages {
  return Object.fromEntries(CLIENT_PARTS.map((part) => [part, m[part]])) as ClientMessages;
}
