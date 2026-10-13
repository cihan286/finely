// ─────────────────────────────────────────────────────────────────────────────
// Company settings (name, timezone and currency)
//
// In plain words: the company's name, its timezone, which decides which
// day each transaction belongs to and when "today" starts on the dashboard,
// and its currency, which decides how every amount is shown.
// Owners and admins can change them; if the timezone differs from this
// device's, a button offers to use the device's instead. Members can see
// them but not change them.
//
// For developers: a client component ("use client") for the forms. Renaming
// goes through Better Auth, which checks the role on the server. The list
// of timezones comes from the server so it's the same on both sides; the
// device's timezone is only read after the page has loaded, so the server's
// HTML and the browser's first render match.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useState,
  useSyncExternalStore,
  type SubmitEvent,
} from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/common/button/Button";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitCompanySettings } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { authClient } from "@/lib/auth-client";
import { CURRENCIES, type CurrencyCode } from "@/lib/finance/currencies";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./CompanySettings.module.css";

interface CompanySettingsProps {
  /** Whether you may change the settings (owners and admins) */
  canManage: boolean;
  /** The company's ID and current name */
  organization: { id: string; name: string };
  timeZone: string;
  /** The currency the company's amounts are in, e.g. "USD" */
  currency: string;
  /** Every timezone to choose from, e.g. "Europe/Istanbul" */
  timeZones: string[];
}

// This device's timezone; null while rendering on the server
const noSubscription = () => () => {};
const useDeviceTimeZone = () =>
  useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );

export default function CompanySettings({
  canManage,
  organization,
  timeZone,
  currency,
  timeZones,
}: CompanySettingsProps) {
  const router = useRouter();
  // Renaming: its result, and whether it's being saved
  const [renamed, setRenamed] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [state, dispatch, pending] = useActionState(
    submitCompanySettings,
    initialActionState,
  );
  const deviceTimeZone = useDeviceTimeZone();

  const save = (value: string) => {
    const formData = new FormData();
    formData.set("timezone", value);
    startTransition(() => dispatch(formData));
  };

  const handleCurrency = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const chosen = String(formData.get("currency"));
    if (
      chosen === currency ||
      !window.confirm(
        `Show every amount in ${chosen} instead of ${currency}? Nothing is converted: 100.00 ${currency} becomes 100.00 ${chosen}.`,
      )
    ) {
      return;
    }
    startTransition(() => dispatch(formData));
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    save(String(new FormData(e.currentTarget).get("timezone")));
  };

  const handleRename = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!name || name === organization.name) return;
    setRenaming(true);
    setRenamed(null);
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: { name },
    });
    setRenaming(false);
    if (error) {
      setRenamed({ type: "error", text: error.message ?? "Could not rename the company. Please try again." });
      return;
    }
    setRenamed({ type: "success", text: `The company is now called ${name}.` });
    // The name is also shown in the top bar and on other pages
    router.refresh();
  };

  return (
    <div className={shared.stack}>
      {renamed && <Message type={renamed.type}>{renamed.text}</Message>}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Company name</h2>
          <p className={shared.cardHint}>
            Shown in the top bar and in the invitations you send.
          </p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleRename}>
            <Input
              name="name"
              aria-label="Company name"
              // Show the saved name after it changes
              key={organization.name}
              defaultValue={organization.name}
              autoComplete="organization"
              maxLength={100}
              className={styles.timezone}
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={renaming}
              text={renaming ? "Saving" : "Save"}
              disabled={renaming}
            />
          </form>
        ) : (
          <p className={styles.current}>{organization.name}</p>
        )}
      </section>

      {(state.error || state.success) && (
        <Message type={state.error ? "error" : "success"}>
          {state.error ?? state.success}
        </Message>
      )}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Timezone</h2>
          <p className={shared.cardHint}>
            Decides which day each transaction belongs to and when a new day
            starts on the dashboard.
          </p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <Select
              name="timezone"
              aria-label="Timezone"
              // Re-select the saved value after it changes
              key={timeZone}
              defaultValue={timeZone}
              className={styles.timezone}
            >
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Save"}
              disabled={pending}
            />
          </form>
        ) : (
          <p className={styles.current}>{timeZone.replaceAll("_", " ")}</p>
        )}
        {canManage && deviceTimeZone && deviceTimeZone !== timeZone && (
          <p className={styles.hint}>
            This device is set to {deviceTimeZone.replaceAll("_", " ")}.{" "}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => save(deviceTimeZone)}
              disabled={pending}
            >
              Use it for the company
            </button>
          </p>
        )}
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Currency</h2>
          <p className={shared.cardHint}>
            The currency your company keeps its books in. Every amount is
            shown in it. Changing it doesn&apos;t convert anything, so choose
            it before adding transactions.
          </p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleCurrency}>
            <Select
              name="currency"
              aria-label="Currency"
              // Re-select the saved value after it changes
              key={currency}
              defaultValue={currency}
              className={styles.timezone}
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} – {CURRENCIES[code]}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Save"}
              disabled={pending}
            />
          </form>
        ) : (
          <p className={styles.current}>
            {currency}
            {currency in CURRENCIES && ` – ${CURRENCIES[currency as CurrencyCode]}`}
          </p>
        )}
      </section>
    </div>
  );
}
