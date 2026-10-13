// ─────────────────────────────────────────────────────────────────────────────
// Activity log page (finely.com/dashboard/settings/activity)
//
// In plain words: who changed what in the company, newest first — a
// transaction that was deleted, a bill that was paid, a teammate whose role
// changed — with the moment it happened in the company's timezone. Only
// owners and admins can read it. It can be narrowed down to one kind of
// thing, e.g. only transactions, searched (part of what happened, or of a
// person's name) and saved as a file.
//
// For developers: the filter, the search and the page number live in the
// address (?area=transaction&q=rent&page=2); the search box is a plain form
// that reloads the page. listAuditLog() refuses members; they see an
// explanation instead of an error page.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import Button from "@/components/common/button/Button";
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

// This page's address (or its export file's) for a filter, a search and a
// page number
function hrefFor(area: string, q: string, page: number, path = PATH): string {
  const params = new URLSearchParams();
  if (area) params.set("area", area);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${path}?${search}` : path;
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
  const q = single(params.q).trim().slice(0, 100);
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
    listAuditLog({
      area,
      search: q,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
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
          href={hrefFor("", q, 1)}
          className={`${styles.filter} ${area === "" ? styles.filterActive : ""}`}
          aria-current={area === "" ? "page" : undefined}
        >
          Everything
        </Link>
        {(Object.keys(AUDIT_AREAS) as AuditArea[]).map((key) => (
          <Link
            key={key}
            href={hrefFor(key, q, 1)}
            className={`${styles.filter} ${area === key ? styles.filterActive : ""}`}
            aria-current={area === key ? "page" : undefined}
          >
            {AUDIT_AREAS[key]}
          </Link>
        ))}
      </nav>

      <div className={styles.tools}>
        {/* Submitting reloads the page with ?q=… (and the filter kept) */}
        <form action={PATH} className={styles.searchBox} role="search">
          {area && <input type="hidden" name="area" value={area} />}
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Search what happened or who did it"
            aria-label="Search the activity log"
            className={styles.search}
          />
        </form>
        {total > 0 && (
          <Button
            href={hrefFor(area, q, 1, `${PATH}/export`)}
            download
            variant="outline"
            size="sm"
            text="Export CSV"
            icon={<Download size={16} />}
          />
        )}
      </div>

      <section className={styles.card}>
        {entries.length === 0 ? (
          <p className={styles.empty}>
            {page > 1
              ? "There's nothing on this page."
              : q
                ? "Nothing matches your search."
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
                  <Link href={hrefFor(area, q, page - 1)} className={styles.pageLink}>
                    <ChevronLeft size={16} /> Newer
                  </Link>
                )}
                {lastShown < total && (
                  <Link href={hrefFor(area, q, page + 1)} className={styles.pageLink}>
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
