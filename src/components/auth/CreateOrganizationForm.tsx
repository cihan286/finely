// ─────────────────────────────────────────────────────────────────────────────
// "Set up your company" form
//
// In plain words: the one question asked after signing up — the company's
// name. Submitting it creates the company with you as its owner, and opens
// the dashboard. Your device's timezone becomes the company's (it can be
// changed in Settings).
//
// For developers: a client component ("use client") because it handles typing
// and the submit in the browser. The company's unique "slug" is generated
// from the name plus a random suffix, so users never have to pick one.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import { authClient } from "@/lib/auth-client";
import Field from "./Field";
import styles from "./AuthForm.module.css";

// "Acme Corp" -> "acme-corp-4f9a2c": readable, and unique thanks to the suffix
function makeSlug(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "Café" -> "Cafe"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}

export default function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!name) return;
    setError(null);
    setLoading(true);

    // Creates the company, makes you its owner and switches you into it
    const { error } = await authClient.organization.create({
      name,
      slug: makeSlug(name),
      // Read by the afterCreateOrganization hook in lib/auth.ts
      metadata: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });

    if (error) {
      setError(error.message ?? "Could not create your company. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <Field
        label="Company name"
        name="name"
        autoComplete="organization"
        placeholder="Northpeak Studio"
        maxLength={100}
        hint="You can invite your team once it's set up."
        required
      />

      <div className={styles.submit}>
        <Button
          type="submit"
          text={loading ? "Setting up…" : "Continue"}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
