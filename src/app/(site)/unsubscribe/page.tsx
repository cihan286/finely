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
import { readUnsubscribeLink } from "@/lib/email/unsubscribe";
import { rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";
import { confirmUnsubscribe } from "./actions";
import styles from "../site.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).site.unsubscribe.title,
    // Personal links: nothing for a search engine
    robots: { index: false },
  };
}

// The way back to these emails, inside the sentences
const settingsLink = {
  settings: (text: string) => <Link href="/dashboard/settings#emails">{text}</Link>,
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
  const t = (await getMessages()).site.unsubscribe;

  return (
    <>
      <span className={styles.label}>{t.label}</span>
      <h1 className={styles.title}>{!target ? t.broken : done ? t.done : t.title}</h1>

      {!target ? (
        <p className={styles.intro}>{rich(t.brokenText, settingsLink)}</p>
      ) : done ? (
        <p className={styles.intro}>{rich(t.stopped[target.kind], settingsLink)}</p>
      ) : (
        <>
          <p className={styles.intro}>{t.question[target.kind]}</p>
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="u" value={query.u} />
            <input type="hidden" name="o" value={query.o} />
            <input type="hidden" name="k" value={query.k} />
            <input type="hidden" name="t" value={query.t} />
            <Button type="submit" variant="primary" text={t.title} />
          </form>
        </>
      )}
    </>
  );
}
