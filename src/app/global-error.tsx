// ─────────────────────────────────────────────────────────────────────────────
// "Something went wrong" page
//
// In plain words: shown instead of the whole site when something breaks so
// badly that not even the page frame can be drawn. It reports the error to
// us (Sentry) and offers to try again.
//
// For developers: a Next.js file convention. It replaces the root layout
// when active, so it renders its own <html> and <body> and imports
// globals.css itself. `error.digest` matches the error in the server logs
// and in Sentry.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Button from "@/components/common/button/Button";
import "./globals.css";
import styles from "./global-error.module.css";

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

  return (
    <html lang="en">
      <body>
        <title>Something went wrong | Finely</title>
        <main className={styles.page}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.text}>
            We&apos;ve been notified and are looking into it. Please try again
            in a moment.
          </p>
          <Button text="Try again" action={retry} />
          {error.digest && (
            <p className={styles.reference}>Reference: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
