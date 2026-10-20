// ─────────────────────────────────────────────────────────────────────────────
// "Your account" settings
//
// In plain words: the last section of Settings, about you rather than the
// company. You can correct your name, and change your email address and
// your password. "Download my
// data" saves a file with what Finely holds about you.
// "Delete my account" removes you from Finely for good, after you typed your
// email address to confirm. Someone who still owns a company is told to hand
// it over or delete it first.
//
// For developers: a client component ("use client"). The name, the email
// address and the password are saved by Better Auth (authClient.updateUser;
// .changeEmail, which emails a link to the new address and only changes it
// once that link is opened; .changePassword, which asks for the current
// password and logs every other device out). The deletion form is sent to the
// submitAccountDeletion server action, which checks everything again
// (lib/data/person.ts) and then goes to the login page. The download is a
// plain link to a route that answers with a file. Also shown on
// /your-account, for people who have no company and so no Settings.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useState,
  type SubmitEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, PasswordInput } from "@/components/common/form/controls";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/components/auth/passwordRules";
import Message from "@/components/common/form/Message";
import { submitAccountDeletion } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { authClient } from "@/lib/auth-client";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { authErrorText } from "@/i18n/auth-errors";
import LanguageSwitcher from "@/components/common/language-switcher/LanguageSwitcher";
import styles from "./OwnerSettings.module.css";

interface PersonSettingsProps {
  /** The signed-in person's name, as it is now */
  name: string;
  /** The signed-in person's email address, to type as confirmation */
  email: string;
  /** Whether they sign in with a password (not only with Google) */
  hasPassword: boolean;
  /** The companies this person owns; while there are any, deleting is refused */
  ownedCompanies: string[];
}

export default function PersonSettings({
  name,
  email,
  hasPassword,
  ownedCompanies,
}: PersonSettingsProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { m } = i18n;
  const t = m.settings.person;
  const [renaming, setRenaming] = useState(false);
  const [renamed, setRenamed] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletion, dispatch, deleting] = useActionState(
    submitAccountDeletion,
    initialActionState,
  );
  // What was typed to confirm the deletion
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === email.toLowerCase();
  const blocked = ownedCompanies.length > 0;

  const handleDelete = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed || blocked) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  const [changing, setChanging] = useState(false);
  const [moving, setMoving] = useState(false);

  const handleEmail = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newEmail = String(new FormData(form).get("newEmail")).trim().toLowerCase();
    if (!newEmail || newEmail === email.toLowerCase()) return;
    setMoving(true);
    setRenamed(null);
    const { error } = await authClient.changeEmail({
      newEmail,
      // Where the link in the email leads once the address has changed
      callbackURL: "/dashboard/settings#you",
    });
    setMoving(false);
    if (error) {
      setRenamed({
        type: "error",
        text: authErrorText(error, i18n, t.emailFailed),
      });
      return;
    }
    form.reset();
    // The same answer whether or not the address is free, so this can't be
    // used to find out who has a Finely account
    setRenamed({
      type: "success",
      text: fill(t.emailSent, { email: newEmail, current: email }),
    });
  };

  const handlePassword = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setChanging(true);
    setRenamed(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(formData.get("currentPassword")),
      newPassword: String(formData.get("newPassword")),
      // Whoever knew the old password is logged out everywhere else
      revokeOtherSessions: true,
    });
    setChanging(false);
    if (error) {
      setRenamed({
        type: "error",
        text:
          error.code === "INVALID_PASSWORD"
            ? t.wrongPassword
            : authErrorText(error, i18n, t.passwordFailed),
      });
      return;
    }
    form.reset();
    setRenamed({
      type: "success",
      text: t.passwordChanged,
    });
  };

  const handleRename = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const typedName = String(new FormData(e.currentTarget).get("name")).trim();
    if (!typedName || typedName === name) return;
    setRenaming(true);
    setRenamed(null);
    const { error } = await authClient.updateUser({ name: typedName });
    setRenaming(false);
    if (error) {
      setRenamed({
        type: "error",
        text: authErrorText(error, i18n, t.nameFailed),
      });
      return;
    }
    setRenamed({ type: "success", text: t.nameSaved });
    // The name is also shown in the top bar and in the team list
    router.refresh();
  };

  return (
    <div className={shared.stack} id="you">
      {renamed && <Message type={renamed.type}>{renamed.text}</Message>}
      {deletion.error && <Message type="error">{deletion.error}</Message>}

      {/* The only place to switch on phones, where the top bar has no room */}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.language}</h2>
          <p className={shared.cardHint}>{t.languageHint}</p>
        </div>
        <div>
          <LanguageSwitcher />
        </div>
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.name}</h2>
          <p className={shared.cardHint}>{t.nameHint}</p>
        </div>
        <form className={styles.form} onSubmit={handleRename}>
          <Input
            name="name"
            aria-label={t.name}
            // Show the saved name after it changes
            key={name}
            defaultValue={name}
            autoComplete="name"
            maxLength={100}
            className={styles.grow}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={renaming}
            text={renaming ? m.common.saving : m.common.save}
            disabled={renaming}
          />
        </form>
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.email}</h2>
          <p className={shared.cardHint}>{fill(t.emailHint, { email })}</p>
        </div>
        <form className={styles.form} onSubmit={handleEmail}>
          <Input
            name="newEmail"
            type="email"
            aria-label={t.newEmail}
            placeholder={t.newEmail}
            autoComplete="email"
            maxLength={254}
            className={styles.grow}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={moving}
            text={moving ? t.sending : t.sendLink}
            disabled={moving}
          />
        </form>
      </section>

      {/* Someone who only signs in with Google has no password here */}
      {hasPassword && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>{t.password}</h2>
            <p className={shared.cardHint}>{t.passwordHint}</p>
          </div>
          <form className={styles.alignedForm} onSubmit={handlePassword}>
            <Field label={t.currentPassword} className={styles.grow}>
              <PasswordInput
                name="currentPassword"
                autoComplete="current-password"
                maxLength={MAX_PASSWORD_LENGTH}
                required
              />
            </Field>
            <Field
              label={t.newPassword}
              hint={fill(m.auth.atLeastCharacters, { min: MIN_PASSWORD_LENGTH })}
              className={styles.grow}
            >
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                required
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={changing}
              text={changing ? t.changing : t.change}
              disabled={changing}
            />
          </form>
        </section>
      )}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.data}</h2>
          <p className={shared.cardHint}>{t.dataHint}</p>
        </div>
        <div>
          <Button
            href="/dashboard/settings/my-data"
            download
            variant="outline"
            size="sm"
            text={t.download}
            icon={<Download size={16} />}
          />
        </div>
      </section>

      <section className={`${shared.card} ${styles.danger}`}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.delete}</h2>
          <p className={shared.cardHint}>{t.deleteHint}</p>
        </div>
        {blocked ? (
          <p className={styles.note}>
            {fill(ownedCompanies.length === 1 ? t.stillOwnsOne : t.stillOwnsMany, {
              companies: ownedCompanies.join(", "),
            })}
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleDelete}>
            <Field label={fill(m.settings.owner.typeToConfirm, { text: email })} className={styles.grow}>
              <Input
                name="confirmation"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <button
              type="submit"
              className={styles.deleteButton}
              disabled={!confirmed || deleting}
            >
              {deleting ? t.deleting : t.delete}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
