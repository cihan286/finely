// ─────────────────────────────────────────────────────────────────────────────
// "Resend verification email" button
//
// In plain words: sends the "verify your email address" email again, for when
// the first one got lost, landed in spam, or the link expired.
//
// For developers: a client component ("use client") because of the click.
// `callbackURL` is where the link in the email will take the user.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import Spinner from "@/components/common/spinner/Spinner";

interface ResendVerificationButtonProps {
  email: string;
  callbackURL: string;
  className?: string;
}

export default function ResendVerificationButton({
  email,
  callbackURL,
  className,
}: ResendVerificationButtonProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleClick = async () => {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL });
    setState(error ? "error" : "sent");
  };

  if (state === "sent") return <span role="status">Sent! Check your inbox.</span>;

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={state === "sending"}
    >
      {state === "sending" ? (
        <>
          <Spinner size={12} /> Sending
        </>
      ) : state === "error" ? (
        "Couldn't send. Try again"
      ) : (
        "Resend email"
      )}
    </button>
  );
}
