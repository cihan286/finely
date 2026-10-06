"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/common/button/Button";
import { authClient } from "@/lib/auth-client";
import Field from "./Field";
import styles from "./AuthForm.module.css";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email: String(data.get("email")),
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
      <p className={styles.success} role="status">
        If an account exists for that email, we&apos;ve sent a link to reset
        your password. It expires in one hour.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        required
      />

      <div className={styles.submit}>
        <Button
          type="submit"
          text={loading ? "Sending…" : "Send reset link"}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
