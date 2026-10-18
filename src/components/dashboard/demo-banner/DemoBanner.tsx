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
import styles from "./DemoBanner.module.css";

export default function DemoBanner({ hoursLeft }: { hoursLeft: number }) {
  const router = useRouter();
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

  return (
    <div className={styles.banner} role="status">
      <Sparkles size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        <strong>You&apos;re exploring a demo.</strong> Northpeak Studio and its money
        are made up, and only you can see this copy: change anything you like. It&apos;s
        deleted in{" "}
        {hoursLeft <= 1 ? "less than an hour" : `${hoursLeft} hours`}.
      </p>
      <button type="button" className={styles.button} onClick={signUp} disabled={leaving}>
        {leaving ? "Leaving the demo" : "Sign up for real"}
      </button>
    </div>
  );
}
