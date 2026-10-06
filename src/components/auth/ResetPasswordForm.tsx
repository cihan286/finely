"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import { authClient } from "@/lib/auth-client";
import Field from "./Field";
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
    router.push("/login?reset=success");
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        required
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
      />

      <div className={styles.submit}>
        <Button
          type="submit"
          text={loading ? "Saving…" : "Set new password"}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
