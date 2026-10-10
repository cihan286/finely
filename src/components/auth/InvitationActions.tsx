// ─────────────────────────────────────────────────────────────────────────────
// Accept / Decline buttons for an invitation
//
// In plain words: the two buttons on the invitation page. Accepting adds you
// to the company and opens its dashboard. Declining removes the invitation.
//
// For developers: a client component ("use client") because of the clicks.
// Accepting also makes the company your active one (Better Auth does that).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";

export default function InvitationActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // Which button is working: "accept", "decline" or none
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  const respond = async (choice: "accept" | "decline") => {
    setBusy(choice);
    setError(null);
    const { error } =
      choice === "accept"
        ? await authClient.organization.acceptInvitation({ invitationId })
        : await authClient.organization.rejectInvitation({ invitationId });
    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      setBusy(null);
      return;
    }
    // Accepted: open the new company's dashboard. Declined: carry on as before
    // (people without a company are taken to set one up).
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className={styles.form}>
      {error && (
        <Message type="error">
          {error}
        </Message>
      )}
      <div className={styles.submit}>
        <Button
          loading={busy === "accept"}
          text={busy === "accept" ? "Joining" : "Accept invitation"}
          size="sm"
          fullWidth
          disabled={busy !== null}
          action={() => respond("accept")}
        />
      </div>
      <div className={styles.submit}>
        <Button
          loading={busy === "decline"}
          text={busy === "decline" ? "Declining" : "Decline"}
          variant="outline"
          size="sm"
          fullWidth
          disabled={busy !== null}
          action={() => respond("decline")}
        />
      </div>
    </div>
  );
}
