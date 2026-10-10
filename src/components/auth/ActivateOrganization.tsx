// ─────────────────────────────────────────────────────────────────────────────
// "Opening your company…"
//
// In plain words: shown for a moment when someone already belongs to a company
// but their current login isn't connected to it yet (e.g. they logged in
// before companies existed). It connects the login to the company, then
// continues to the dashboard.
//
// For developers: a client component ("use client") because it calls the
// browser auth API once when it appears.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Message from "@/components/common/form/Message";
import styles from "./AuthForm.module.css";

export default function ActivateOrganization({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    authClient.organization.setActive({ organizationId }).then(({ error }) => {
      if (error) {
        setFailed(true);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }, [organizationId, router]);

  return failed ? (
    <Message type="error">
      We couldn&apos;t open your company. Please refresh the page to try again.
    </Message>
  ) : (
    <p className={styles.subtitle} role="status">
      Opening your company…
    </p>
  );
}
