// ─────────────────────────────────────────────────────────────────────────────
// Root layout — the outer shell of every page
//
// In plain words: every page of the site (home, login, dashboard…) is placed
// inside this file. It loads the fonts, the global styles, and sets the text
// browsers and search engines show for the site: the tab title and description.
// It also decides the page's language (English or Turkish) and hands its
// words to every part of the page, and the notification window that pops
// up after an action.
//
// For developers: Next.js App Router root layout. Pages can override the title
// with their own `metadata`; it then appears as "<page title> | Finely".
// Every page is rendered per request (connection() below): each gets a new
// one-time code for its scripts (proxy.ts, lib/csp.ts), which a page built
// ahead of time couldn't have.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Arimo, Lexend } from "next/font/google";
import { connection } from "next/server";
import { NoticeProvider } from "@/components/common/notice/Notice";
import { I18nProvider } from "@/i18n/client";
import { clientMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
import "./globals.css";

// Fonts: Arimo for regular text, Lexend for the logo, with the letters
// Turkish needs (ı, ş, ğ… are in latin-ext). Next.js downloads them
// at build time so visitors don't load them from Google.
const arimo = Arimo({
  variable: "--arimo",
  subsets: ["latin", "latin-ext"],
});

const lexend = Lexend({
  variable: "--lexend",
  subsets: ["latin", "latin-ext"],
});

// The browser tab title and the description shown in search results
export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: {
      default: m.meta.defaultTitle,
      template: "%s | Finely",
    },
    description: m.meta.description,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Wait for the visitor's request: see the note at the top
  await connection();
  // The page's language (i18n/server.ts), handed to the parts in the browser
  const { locale, m } = await getI18n();
  return (
    <html
      lang={locale}
      className={`${arimo.variable} ${lexend.variable}`}
      // Smooth scrolling is switched on in globals.css; this asks Next.js to
      // turn it off briefly when changing pages, so new pages open at the top
      data-scroll-behavior="smooth"
    >
      <body>
        <I18nProvider locale={locale} messages={clientMessages(m)}>
          <NoticeProvider>{children}</NoticeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
