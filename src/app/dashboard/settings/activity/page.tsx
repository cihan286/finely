// ─────────────────────────────────────────────────────────────────────────────
// Activity log page (finely.com/dashboard/settings/activity)
//
// In plain words: who changed what in the company, newest first — a
// transaction that was deleted, a bill that was paid, a teammate whose role
// changed — with the moment it happened in the company's timezone. Only
// owners and admins can read it. It can be narrowed down to one kind of
// thing, e.g. only transactions.
//
// For developers: the filter and the page number live in the address
// (?area=transaction&page=2). listAuditLog() refuses members; they see an
// explanation instead of an error page.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Message from "@/components/common/form/Message";
import { listAuditLog } from "@/lib/data/audit";
import { getCompanyTimeZone } from "@/lib/data/common";
import { AUDIT_AREAS, type AuditArea } from "@/lib/finance/audit";
import { formatDateTime } from "@/lib/format";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import styles from "./page.module.css";

// Browser tab title: "Activity log | Finely"
export const metadata: Metadata = {
  title: "Activity log",
};

const PAGE_SIZE = 50;
const PATH = "/dashboard/settings/activity";

// One value from the address: the first if repeated, "" if missing
const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

// This page's address for a filter and a page number
function hrefFor(area: string, page: number): string {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${PATH}?${search}` : PATH;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { organization, role } = await requireOrganization();
  const params = await searchParams;
  const requested = single(params.area);
  const area = requested in AUDIT_AREAS ? requested : "";
  const page = Math.max(Math.trunc(Number(single(params.page))) || 1, 1);

  const header = (
    <div>
      <Link href="/dashboard/settings" className={styles.back}>
        <ChevronLeft size={16} /> Settings
      </Link>
      <h1 className={styles.title}>Activity log</h1>
      <p className={styles.subtitle}>
        Who changed what in {organization.name}, newest first.
      </p>
    </div>
  );

  if (!canManageFinances(role)) {
    return (
      <main className={styles.page}>
        {header}
        <Message type="info">Only owners and admins can read the activity log.</Message>
      </main>
    );
  }

  const [{ entries, total }, timeZone] = await Promise.all([
    listAuditLog({ area, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getCompanyTimeZone(organization.id),
  ]);
  const firstShown = (page - 1) * PAGE_SIZE + 1;
  const lastShown = firstShown + entries.length - 1;

  return (
    <main className={styles.page}>
      {header}

      {/* One kind of thing, or everything */}
      <nav className={styles.filters} aria-label="Show">
        <Link
          href={hrefFor("", 1)}
          className={`${styles.filter} ${area === "" ? styles.filterActive : ""}`}
          aria-current={area === "" ? "page" : undefined}
        >
          Everything
        </Link>
        {(Object.keys(AUDIT_AREAS) as AuditArea[]).map((key) => (
          <Link
            key={key}
            href={hrefFor(key, 1)}
            className={`${styles.filter} ${area === key ? styles.filterActive : ""}`}
            aria-current={area === key ? "page" : undefined}
          >
            {AUDIT_AREAS[key]}
          </Link>
        ))}
      </nav>

      <section className={styles.card}>
        {entries.length === 0 ? (
          <p className={styles.empty}>
            {page > 1
              ? "There's nothing on this page."
              : area
                ? "Nothing has been recorded here yet."
                : "Nothing has been recorded yet. Changes made from now on will show up here."}
          </p>
        ) : (
          <>
            <ul className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.what}>
                    <span className={styles.summary}>{entry.summary}</span>
                    <span className={styles.meta}>
                      {entry.actor} · {AUDIT_AREAS[entry.area] ?? entry.area}
                    </span>
                  </div>
                  <time className={styles.when} dateTime={entry.at.toISOString()}>
                    {formatDateTime(entry.at, timeZone)}
                  </time>
                </li>
              ))}
            </ul>

            {/* Paging */}
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Showing {firstShown}–{lastShown} of {total}
              </span>
              <div className={styles.pageLinks}>
                {page > 1 && (
                  <Link href={hrefFor(area, page - 1)} className={styles.pageLink}>
                    <ChevronLeft size={16} /> Newer
                  </Link>
                )}
                {lastShown < total && (
                  <Link href={hrefFor(area, page + 1)} className={styles.pageLink}>
                    Older <ChevronRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
