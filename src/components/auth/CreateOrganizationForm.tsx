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
import Field from "@/components/common/form/Field";
import { Input } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { authClient } from "@/lib/auth-client";
import { authErrorText } from "@/i18n/auth-errors";
import { useI18n } from "@/i18n/client";
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
  const i18n = useI18n();
  const t = i18n.m.auth.onboarding;
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
      setError(authErrorText(error, i18n, t.failed));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
        label={t.companyName}
        hint={t.companyHint}
      >
        <Input
          size="lg"
          name="name"
          autoComplete="organization"
          placeholder={t.companyPlaceholder}
          maxLength={100}
          required
        />
      </Field>

      <div className={styles.submit}>
        <Button
          type="submit"
          loading={loading}
          text={loading ? t.settingUp : t.continue}
          size="sm"
          fullWidth
          disabled={loading}
        />
      </div>
    </form>
  );
}
