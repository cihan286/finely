"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import { authClient } from "@/lib/auth-client";
import Field from "./Field";
import GoogleButton from "./GoogleButton";
import styles from "./AuthForm.module.css";

interface LoginFormProps {
  googleEnabled: boolean;
  /** Shown above the form, e.g. after a password reset */
  notice?: string;
}

export default function LoginForm({ googleEnabled, notice }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);

    const { error } = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });

    if (error) {
      setError(error.message ?? "Could not log in. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      {googleEnabled && (
        <>
          <GoogleButton label="Continue with Google" onError={setError} />
          <div className={styles.divider}>or</div>
        </>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        {notice && !error && <p className={styles.success}>{notice}</p>}
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
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          labelAside={
            <Link
              href="/forgot-password"
              className={`${styles.link} ${styles.smallLink}`}
            >
              Forgot password?
            </Link>
          }
        />

        <div className={styles.submit}>
          <Button
            type="submit"
            text={loading ? "Logging in…" : "Log in"}
            size="sm"
            fullWidth
            disabled={loading}
          />
        </div>
      </form>
    </>
  );
}
