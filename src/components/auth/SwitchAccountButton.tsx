// ─────────────────────────────────────────────────────────────────────────────
// "Use a different account" button
//
// In plain words: logs you out and opens the login page, then brings you back
// to where you were — e.g. when an invitation was sent to another email
// address than the one you're logged in with.
//
// For developers: a client component ("use client") because signing out runs
// in the browser. `next` must be a same-site path.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";

export default function SwitchAccountButton({ next }: { next: string }) {
  const router = useRouter();

  const handleClick = async () => {
    await authClient.signOut();
    router.push(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  return (
    <button type="button" className={styles.linkButton} onClick={handleClick}>
      Use a different account
    </button>
  );
}
