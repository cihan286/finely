// ─────────────────────────────────────────────────────────────────────────────
// "Forgot your password?" form
//
// In plain words: asks for an email address and requests a password reset
// link for it. Afterwards it always shows the same confirmation, whether or not
// that email has an account — so nobody can use it to check who's registered.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";

export default function ForgotPasswordForm() {
  // Whether the request went through (then the confirmation replaces the form)
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Stop the browser from reloading the page; we send the request ourselves
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email: String(data.get("email")),
      // The page the emailed link will open
      redirectTo: "/reset-password",
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  };

  // Same message whether or not the account exists, so this page can't be
  // used to find out which emails are registered.
  if (sent) {
    return (
      <Message type="success">
        If an account exists for that email, we&apos;ve sent a link to reset
        your password. It expires in one hour.
      </Message>
    );
  }

  return (
    // method="post": if it is sent before the page has finished loading, the
    // fields (such as the password) must not end up in the address bar
    <form className={styles.form} method="post" onSubmit={handleSubmit}>
      {error && (
        <Message type="error">
          {error}
        </Message>
      )}

      <Field label="Email">
        <Input
          size="lg"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </Field>

      <div className={styles.submit}>
        <Button
          type="submit"
          loading={loading}
          text={loading ? "Sending" : "Send reset link"}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
