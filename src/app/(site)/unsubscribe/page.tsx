// ─────────────────────────────────────────────────────────────────────────────
// Unsubscribe page (finely.com/unsubscribe)
//
// In plain words: where the "Unsubscribe" link at the bottom of the weekly
// summary and the alert emails leads. It says which emails will stop and
// asks to confirm with one button; no login needed. Afterwards it says how
// to switch them back on.
//
// For developers: the link's query (?u, o, k, t) names the person, the
// company and the kind of email, with a signature (lib/email/unsubscribe.ts).
// Opening the page changes nothing: mail scanners open every link in an
// email, so only the button does (actions.ts). The company's name isn't
// shown before that, as the page is open to anyone with the link.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/common/button/Button";
import { EMAIL_KIND_LABELS, readUnsubscribeLink } from "@/lib/email/unsubscribe";
import { confirmUnsubscribe } from "./actions";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Unsubscribe",
  // Personal links: nothing for a search engine
  robots: { index: false },
};

// One value from the address: the first if repeated, "" if missing
const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = {
    u: single(params.u),
    o: single(params.o),
    k: single(params.k),
    t: single(params.t),
  };
  const target = readUnsubscribeLink(query);
  const done = Boolean(single(params.done));

  return (
    <>
      <span className={styles.label}>Email notifications</span>
      <h1 className={styles.title}>
        {!target ? "This link doesn't work" : done ? "You're unsubscribed" : "Unsubscribe"}
      </h1>

      {!target ? (
        <p className={styles.intro}>
          The link is incomplete or was changed. Open the link in the email
          again, or choose your emails under{" "}
          <Link href="/dashboard/settings#emails">Settings → Email notifications</Link>.
        </p>
      ) : done ? (
        <p className={styles.intro}>
          You won&apos;t get {EMAIL_KIND_LABELS[target.kind]} for this company
          any more. Changed your mind? Switch it back on under{" "}
          <Link href="/dashboard/settings#emails">Settings → Email notifications</Link>.
        </p>
      ) : (
        <>
          <p className={styles.intro}>
            Stop {EMAIL_KIND_LABELS[target.kind]} for this company? Your other
            emails from Finely stay as they are.
          </p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="u" value={query.u} />
            <input type="hidden" name="o" value={query.o} />
            <input type="hidden" name="k" value={query.k} />
            <input type="hidden" name="t" value={query.t} />
            <Button type="submit" variant="primary" text="Unsubscribe" />
          </form>
        </>
      )}
    </>
  );
}
