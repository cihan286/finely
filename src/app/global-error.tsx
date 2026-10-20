// ─────────────────────────────────────────────────────────────────────────────
// "Something went wrong" page
//
// In plain words: shown instead of the whole site when something breaks so
// badly that not even the page frame can be drawn. It reports the error to
// us (Sentry) and offers to try again.
//
// For developers: a Next.js file convention. It replaces the root layout
// when active, so it renders its own <html> and <body>, imports
// globals.css itself, and works out the language without the server (the
// language cookie, else the browser's language). `error.digest` matches the error in the server logs
// and in Sentry.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as Sentry from "@sentry/nextjs";
import Button from "@/components/common/button/Button";
import {
  fill,
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  type Locale,
} from "@/i18n/config";
import "./globals.css";
import styles from "./global-error.module.css";

// This page's words in each language: few enough to keep here, so the
// page works without loading every sentence of the app
const WORDS: Record<Locale, { title: string; text: string; tryAgain: string; reference: string }> = {
  en: {
    title: "Something went wrong",
    text: "We've been notified and are looking into it. Please try again in a moment.",
    tryAgain: "Try again",
    reference: "Reference: {digest}",
  },
  tr: {
    title: "Bir şeyler ters gitti",
    text: "Bu durumdan haberdar edildik ve inceliyoruz. Lütfen birazdan tekrar deneyin.",
    tryAgain: "Tekrar dene",
    reference: "Referans: {digest}",
  },
};

// The language picked with the switcher (its cookie), else the browser's
function browserLocale(): Locale {
  const picked = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return isLocale(picked) ? picked : localeFromAcceptLanguage(navigator.languages.join(","));
}
const noSubscription = () => () => {};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  // English while drawn on the server; then the browser's choice
  const locale = useSyncExternalStore(noSubscription, browserLocale, () => "en" as Locale);
  const t = WORDS[locale];

  return (
    <html lang={locale}>
      <body>
        <title>{`${t.title} | Finely`}</title>
        <main className={styles.page}>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.text}>{t.text}</p>
          <Button text={t.tryAgain} action={retry} />
          {error.digest && (
            <p className={styles.reference}>{fill(t.reference, { digest: error.digest })}</p>
          )}
        </main>
      </body>
    </html>
  );
}
