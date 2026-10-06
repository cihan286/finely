// ─────────────────────────────────────────────────────────────────────────────
// "Continue with Google" button
//
// In plain words: sends the visitor to Google to confirm who they are. Google
// then sends them back to Finely, logged in. If they're new, an account is
// created for them automatically.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser. Only rendered when Google credentials
// are configured (see isGoogleEnabled in lib/auth.ts).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "@/lib/auth-client";
import styles from "./AuthForm.module.css";

interface GoogleButtonProps {
  label: string;
  onError: (message: string) => void;
}

export default function GoogleButton({ label, onError }: GoogleButtonProps) {
  // True while we're sending the visitor to Google (disables the button)
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // Redirects to Google; on success Google sends the user back to callbackURL
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (error) {
      onError(error.message ?? "Could not connect to Google. Please try again.");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.googleButton}
      onClick={handleClick}
      disabled={loading}
    >
      <FcGoogle size={20} aria-hidden="true" />
      {loading ? "Redirecting to Google…" : label}
    </button>
  );
}
