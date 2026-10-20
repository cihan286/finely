// ─────────────────────────────────────────────────────────────────────────────
// Languages: which one this request is in (server side)
//
// In plain words: the language someone picked with the switcher is kept in
// a cookie. Before they pick one, the language their browser asks for
// decides, and anything else gets English.
//
// For developers: server-only. getI18n() gives a page, server action or
// data function the language and its words. Outside a request (tests,
// scripts) it answers English instead of failing. Emails sent later, without
// a request (the weekly summary), use the language saved on the person
// (user.locale, saved by setLocale() in actions.ts).
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  type Locale,
} from "./config";
import { messagesFor, type Messages } from "./messages";

/** The language of the current request. Cached for the request. */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const picked = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(picked)) return picked;
    return localeFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return DEFAULT_LOCALE; // outside a request
  }
});

/** The language of the current request and its words */
export async function getI18n(): Promise<{ locale: Locale; m: Messages }> {
  const locale = await getLocale();
  return { locale, m: messagesFor(locale) };
}

/** The words of the current request's language */
export async function getMessages(): Promise<Messages> {
  return messagesFor(await getLocale());
}
