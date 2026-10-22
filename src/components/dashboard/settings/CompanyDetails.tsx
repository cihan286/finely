// ─────────────────────────────────────────────────────────────────────────────
// Company details (registered name, tax number, address…)
//
// In plain words: who the company officially is, as it will appear on
// invoices: its registered name, country, tax number and tax office,
// registration numbers, address and contact details. Owners and admins
// can change them; everyone else sees them but can't change them.
//
// For developers: a client component ("use client") for the form, which
// goes to the submitCompanyProfile server action (the tax number is checked
// there, in lib/data/company-profile.ts). It submits via onSubmit +
// startTransition so what was typed stays when the server answers with an
// error. The countries come from the server, named in the page's language,
// so the server's HTML and the browser's first render match.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select, Textarea } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { useActionNotice } from "@/components/common/notice/Notice";
import { submitCompanyProfile } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import type { CompanyProfile } from "@/lib/data/company-profile";
import { useI18n } from "@/i18n/client";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./CompanyDetails.module.css";

interface CompanyDetailsProps {
  /** Whether you may change the details (owners and admins) */
  canEdit: boolean;
  profile: CompanyProfile;
  /** Every country to choose from, sorted by name in the page's language */
  countries: { code: string; name: string }[];
}

export default function CompanyDetails({ canEdit, profile, countries }: CompanyDetailsProps) {
  const { m } = useI18n();
  const t = m.settings.details;
  const [state, dispatch, pending] = useActionState(submitCompanyProfile, initialActionState);
  useActionNotice(state);

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  // One box: its label, and what's saved in it
  const text = (
    name: keyof CompanyProfile,
    extra: { placeholder?: string; type?: string; maxLength?: number; inputMode?: "numeric" } = {},
  ) => (
    <Field label={t[name]}>
      <Input
        name={name}
        defaultValue={profile[name] ?? ""}
        maxLength={extra.maxLength ?? 200}
        {...extra}
      />
    </Field>
  );

  return (
    <section className={shared.card} id="details">
      <div className={shared.cardHeader}>
        <h2 className={shared.cardTitle}>{t.title}</h2>
        <p className={shared.cardHint}>{t.hint}</p>
      </div>
      {!canEdit && <Message type="info">{t.onlyManagers}</Message>}
      <form className={styles.form} onSubmit={submit}>
        {/* Others see the details but can't change them */}
        <fieldset className={styles.fields} disabled={!canEdit}>
          <div className={styles.wide}>
            {text("legalName", { placeholder: t.legalNamePlaceholder, maxLength: 250 })}
          </div>
          <Field label={t.country}>
            <Select name="country" defaultValue={profile.country ?? ""}>
              <option value="">{t.noCountry}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.taxId} hint={t.taxIdHint}>
            <Input
              name="taxId"
              defaultValue={profile.taxId ?? ""}
              maxLength={40}
              autoComplete="off"
            />
          </Field>
          {text("taxOffice", { maxLength: 100 })}
          {text("mersisNo", { inputMode: "numeric", maxLength: 40 })}
          {text("tradeRegistryNo", { maxLength: 40 })}
          <div className={styles.wide}>
            <Field label={t.address}>
              <Textarea
                name="address"
                defaultValue={profile.address ?? ""}
                maxLength={500}
                rows={2}
              />
            </Field>
          </div>
          {text("district", { maxLength: 100 })}
          {text("city", { maxLength: 100 })}
          {text("postalCode", { maxLength: 20 })}
          {text("phone", { type: "tel", maxLength: 40 })}
          {text("email", { type: "email" })}
          {text("website", { type: "url", placeholder: "https://" })}
        </fieldset>
        {canEdit && (
          <div className={styles.footer}>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? m.common.saving : m.settings.save}
              disabled={pending}
            />
          </div>
        )}
      </form>
    </section>
  );
}
