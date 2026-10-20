"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Language switcher
//
// In plain words: two small buttons, "EN" and "TR", that switch Finely
// between English and Turkish. The choice is remembered (i18n/actions.ts)
// and the page is drawn again in the new language.
//
// For developers: shown in the public pages' header and footer, the
// dashboard's top bar and the auth pages.
// ─────────────────────────────────────────────────────────────────────────────

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { useI18n } from "@/i18n/client";
import styles from "./LanguageSwitcher.module.css";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, m } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={m.common.language}
      className={`${styles.switcher} ${className ?? ""}`}
      aria-busy={pending}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={styles.option}
          aria-pressed={option === locale}
          aria-label={LOCALE_NAMES[option]}
          title={LOCALE_NAMES[option]}
          disabled={pending}
          onClick={() => {
            if (option === locale) return;
            startTransition(async () => {
              await setLocale(option);
              router.refresh();
            });
          }}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
