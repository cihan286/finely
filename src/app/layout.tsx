// ─────────────────────────────────────────────────────────────────────────────
// Root layout — the outer shell of every page
//
// In plain words: every page of the site (home, login, dashboard…) is placed
// inside this file. It loads the fonts, the global styles, and sets the text
// browsers and search engines show for the site: the tab title and description.
//
// For developers: Next.js App Router root layout. Pages can override the title
// with their own `metadata`; it then appears as "<page title> | Finely".
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Arimo, Lexend } from "next/font/google";
import "./globals.css";

// Fonts: Arimo for regular text, Lexend for the logo. Next.js downloads them
// at build time so visitors don't load them from Google.
const arimo = Arimo({
  variable: "--arimo",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--lexend",
  subsets: ["latin"],
});

// The browser tab title and the description shown in search results
export const metadata: Metadata = {
  title: {
    default: "Finely – Financial clarity for modern businesses",
    template: "%s | Finely",
  },
  description:
    "Track expenses automatically, see your cash flow in real time, and turn your business's financial data into clear, actionable insights.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${arimo.variable} ${lexend.variable}`}
      // Smooth scrolling is switched on in globals.css; this asks Next.js to
      // turn it off briefly when changing pages, so new pages open at the top
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
