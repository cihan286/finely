// ─────────────────────────────────────────────────────────────────────────────
// Company switcher
//
// In plain words: shows the company you're working in, in the top bar.
// Clicking it opens a list of your companies (your own, plus ones you were
// invited to) to switch to another, and "New company" to set up one more.
// Finely remembers the choice, so your next login opens the same company.
//
// For developers: a client component ("use client") for the menu. Switching
// changes the login's active company on the server (Better Auth checks the
// person really belongs to it), then goes to the dashboard overview and
// reloads the data: addresses such as ?edit=<id> belong to the old company.
// "New company" opens /onboarding?new=1.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import Spinner from "@/components/common/spinner/Spinner";
import { authClient } from "@/lib/auth-client";
import { useDismiss } from "@/lib/use-dismiss";
import styles from "./CompanySwitcher.module.css";

interface Company {
  id: string;
  name: string;
}

interface CompanySwitcherProps {
  /** The company the user is working in */
  current: Company;
  /** Every company the user belongs to, including the current one */
  companies: Company[];
}

export default function CompanySwitcher({ current, companies }: CompanySwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The company being switched to, until the page shows it
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismiss(wrapRef, open, useCallback(() => setOpen(false), []));

  const switching = switchingTo !== null && switchingTo !== current.id;

  const switchTo = async (company: Company) => {
    setOpen(false);
    if (company.id === current.id) return;
    setSwitchingTo(company.id);
    const { error } = await authClient.organization.setActive({
      organizationId: company.id,
    });
    if (error) {
      // E.g. removed from that company meanwhile. Better Auth then leaves
      // this login without a company; reloading sends it through
      // /onboarding, which opens one the person still belongs to.
      setSwitchingTo(null);
      router.refresh();
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.company} ${styles.button}`}
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={switching || undefined}
        aria-label={`Company: ${current.name}. Switch company`}
        title={current.name}
      >
        {switching ? <Spinner /> : <Building2 size={16} aria-hidden="true" />}
        <span className={styles.name}>{current.name}</span>
        <ChevronsUpDown size={14} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="menu" aria-label="Your companies">
          {companies.map((company) => {
            const active = company.id === current.id;
            return (
              <button
                key={company.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`${styles.item} ${active ? styles.active : ""}`}
                onClick={() => switchTo(company)}
              >
                <span className={styles.name}>{company.name}</span>
                {active && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
          <Link
            href="/onboarding?new=1"
            role="menuitem"
            className={`${styles.item} ${styles.add}`}
            onClick={() => setOpen(false)}
          >
            <Plus size={16} aria-hidden="true" />
            <span className={styles.name}>New company</span>
          </Link>
        </div>
      )}
    </div>
  );
}
