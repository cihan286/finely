// ─────────────────────────────────────────────────────────────────────────────
// "You're in the demo" banner
//
// In plain words: a strip under the top bar of a demo company's dashboard
// ("Try the demo" on the home page). It says the company and its money are
// made up, when it will be deleted, and offers to sign up for real, which
// leaves the demo first.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { fill, plural } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import styles from "./DemoBanner.module.css";

export default function DemoBanner({ hoursLeft }: { hoursLeft: number }) {
  const router = useRouter();
  const t = useI18n().m.shell.demo;
  const [leaving, setLeaving] = useState(false);

  const signUp = async () => {
    setLeaving(true);
    const { error } = await authClient.signOut();
    if (error) {
      setLeaving(false);
      return;
    }
    router.push("/signup");
    router.refresh();
  };

  const lifetime = hoursLeft <= 1 ? t.lessThanHour : plural(hoursLeft, t.hours);

  return (
    <div className={styles.banner} role="status">
      <Sparkles size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        <strong>{t.exploring}</strong>{" "}
        {/* Phones get the short version: the banner never scrolls away */}
        <span className={styles.long}>{fill(t.long, { lifetime })}</span>
        <span className={styles.short}>{fill(t.short, { lifetime })}</span>
      </p>
      <button type="button" className={styles.button} onClick={signUp} disabled={leaving}>
        {leaving ? t.leaving : t.signUp}
      </button>
    </div>
  );
}
