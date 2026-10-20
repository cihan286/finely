// ─────────────────────────────────────────────────────────────────────────────
// "Please verify your email" banner
//
// In plain words: a strip under the top bar of the dashboard, shown until the
// person clicks the link in their verification email. They can use Finely
// meanwhile, but need a verified email to join a team.
// ─────────────────────────────────────────────────────────────────────────────

import { MailWarning } from "lucide-react";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import { fill } from "@/i18n/config";
import { bold, rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";
import styles from "./VerifyEmailBanner.module.css";

export default async function VerifyEmailBanner({ email }: { email: string }) {
  const t = (await getMessages()).shell.verify;
  return (
    <div className={styles.banner} role="status">
      <MailWarning size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        {t.please}{" "}
        {/* Phones get the short version: the banner never scrolls away */}
        <span className={styles.long}>{rich(fill(t.sentTo, { email }), bold)}</span>
      </p>
      <ResendVerificationButton
        email={email}
        callbackURL="/dashboard"
        className={styles.button}
      />
    </div>
  );
}
