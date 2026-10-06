// ─────────────────────────────────────────────────────────────────────────────
// "Please verify your email" banner
//
// In plain words: a strip under the top bar of the dashboard, shown until the
// person clicks the link in their verification email. They can use Finely
// meanwhile, but need a verified email to join a team.
// ─────────────────────────────────────────────────────────────────────────────

import { MailWarning } from "lucide-react";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import styles from "./VerifyEmailBanner.module.css";

export default function VerifyEmailBanner({ email }: { email: string }) {
  return (
    <div className={styles.banner} role="status">
      <MailWarning size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        Please verify your email address. We sent a link to{" "}
        <strong>{email}</strong>.
      </p>
      <ResendVerificationButton
        email={email}
        callbackURL="/dashboard"
        className={styles.button}
      />
    </div>
  );
}
