// ─────────────────────────────────────────────────────────────────────────────
// Sign-up form
//
// In plain words: the form for creating an account — full name, work email and
// a password of at least 8 characters. On success the new user is logged in and
// taken to company setup (or back to the invitation they came from). If the email is already registered, an error appears.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import { authClient } from "@/lib/auth-client";
import Field from "./Field";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./passwordRules";
import GoogleButton from "./GoogleButton";
import styles from "./AuthForm.module.css";

interface SignupFormProps {
  googleEnabled: boolean;
  /** Where to go after signing up; by default, company setup */
  next?: string;
}

export default function SignupForm({
  googleEnabled,
  next = "/onboarding",
}: SignupFormProps) {
  const router = useRouter();
  // The error message to show, if any
  const [error, setError] = useState<string | null>(null);
  // True while waiting for the server; the button shows "Creating account…"
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    // Stop the browser from reloading the page; we send the details ourselves
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);

    // Signs the user in right away on success
    const { error } = await authClient.signUp.email({
      name: String(data.get("name")).trim(),
      email: String(data.get("email")),
      password: String(data.get("password")),
      // Where the link in the verification email will take them
      callbackURL: next,
    });

    if (error) {
      setError(error.message ?? "Could not create your account. Please try again.");
      setLoading(false);
      return;
    }
    // Success: continue to company setup (or e.g. back to an invitation),
    // and refresh so the next page loads with the new login
    router.push(next);
    router.refresh();
  };

  return (
    <>
      {/* Google option first, then an "or" divider, when Google is set up */}
      {googleEnabled && (
        <>
          <GoogleButton
            label="Sign up with Google"
            onError={setError}
            callbackURL={next}
          />
          <div className={styles.divider}>or</div>
        </>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Maya Carter"
          required
        />
        <Field
          label="Work email"
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
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          required
        />

        <div className={styles.submit}>
          <Button
            type="submit"
            text={loading ? "Creating account…" : "Create account"}
            size="sm"
            fullWidth
            disabled={loading}
          />
        </div>
      </form>
    </>
  );
}
