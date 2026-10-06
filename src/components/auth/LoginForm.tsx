// ─────────────────────────────────────────────────────────────────────────────
// Login form
//
// In plain words: the email + password form on the login page. When submitted,
// it asks the server to check the details. If they're right, the user goes to
// the dashboard; if not, an error message appears above the form.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser.
// ─────────────────────────────────────────────────────────────────────────────

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
  /** Where to go after logging in (e.g. back to an invitation) */
  next?: string;
}

export default function LoginForm({
  googleEnabled,
  notice,
  next = "/dashboard",
}: LoginFormProps) {
  const router = useRouter();
  // The error message to show (e.g. "Invalid email or password"), if any
  const [error, setError] = useState<string | null>(null);
  // True while waiting for the server; the button shows "Logging in…"
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Stop the browser's default form behavior (reloading the page); we send
    // the details ourselves
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
    // Success: continue (usually to the dashboard), and refresh so the next
    // page loads with the new login
    router.push(next);
    router.refresh();
  };

  return (
    <>
      {/* Google option first, then an "or" divider, when Google is set up */}
      {googleEnabled && (
        <>
          <GoogleButton
            label="Continue with Google"
            onError={setError}
            callbackURL={next}
          />
          <div className={styles.divider}>or</div>
        </>
      )}

      {/* method="post": if it is sent before the page has finished loading, the
          fields (such as the password) must not end up in the address bar */}
      <form className={styles.form} method="post" onSubmit={handleSubmit}>
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
