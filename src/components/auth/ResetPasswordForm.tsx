// ─────────────────────────────────────────────────────────────────────────────
// "Choose a new password" form
//
// In plain words: the form opened from the password reset link. The user types
// a new password twice; if both match and the link is still valid, the password
// is changed and they're sent to the login page.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser. `token` is the one-time code from the
// emailed link that proves the request is genuine.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { PasswordInput } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { authClient } from "@/lib/auth-client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./passwordRules";
import styles from "./AuthForm.module.css";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));

    // Catch typos: both boxes must contain the same password
    if (password !== String(data.get("confirm"))) {
      setError("The passwords don't match.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      setError(
        error.message ??
          "This reset link is invalid or has expired. Please request a new one.",
      );
      setLoading(false);
      return;
    }
    // Success: go to the login page, which shows "Your password was changed"
    router.push("/login?reset=success");
  };

  return (
    // method="post": if it is sent before the page has finished loading, the
    // fields (such as the password) must not end up in the address bar
    <form className={styles.form} method="post" onSubmit={handleSubmit}>
      {error && (
        <Message type="error">
          {error}
        </Message>
      )}

      <Field
        label="New password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      >
        <PasswordInput
          size="lg"
          name="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          required
        />
      </Field>
      <Field label="Confirm new password">
        <PasswordInput
          size="lg"
          name="confirm"
          autoComplete="new-password"
          required
        />
      </Field>

      <div className={styles.submit}>
        <Button
          type="submit"
          loading={loading}
          text={loading ? "Saving" : "Set new password"}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
