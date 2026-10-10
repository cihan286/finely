// ─────────────────────────────────────────────────────────────────────────────
// Company settings (timezone)
//
// In plain words: the company's timezone, which decides which day each
// transaction belongs to and when "today" starts on the dashboard. Owners and
// admins can change it; if it differs from this device's timezone, a button
// offers to use the device's instead. Members can see it but not change it.
//
// For developers: a client component ("use client") for the form. The list
// of timezones comes from the server so it's the same on both sides; the
// device's timezone is only read after the page has loaded, so the server's
// HTML and the browser's first render match.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useSyncExternalStore,
  type SubmitEvent,
} from "react";
import Button from "@/components/common/button/Button";
import { Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitCompanySettings } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./CompanySettings.module.css";

interface CompanySettingsProps {
  /** Whether you may change the settings (owners and admins) */
  canManage: boolean;
  timeZone: string;
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
  timeZone,
  timeZones,
}: CompanySettingsProps) {
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

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    save(String(new FormData(e.currentTarget).get("timezone")));
  };

  return (
    <div className={shared.stack}>
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
              text={pending ? "Saving…" : "Save"}
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
    </div>
  );
}
