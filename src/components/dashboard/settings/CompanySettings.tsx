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
import { useActionNotice, useNotify } from "@/components/common/notice/Notice";
import { submitCompanySettings } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { authClient } from "@/lib/auth-client";
import { CURRENCIES, currencyName, type CurrencyCode } from "@/lib/finance/currencies";
import { fill, intlLocale } from "@/i18n/config";
import { authErrorText } from "@/i18n/auth-errors";
import { useI18n } from "@/i18n/client";
import { amountInputProps, formatCurrency } from "@/lib/format";
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
  /** The most to spend per month in total; null without an overall budget */
  monthlyBudget: number | null;
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
  monthlyBudget,
  timeZones,
}: CompanySettingsProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { locale, m } = i18n;
  const t = m.settings.company;
  const saveText = (busy: boolean) => (busy ? m.common.saving : m.settings.save);
  const notify = useNotify();
  // Whether the name is being saved
  const [renaming, setRenaming] = useState(false);
  // One of each per form, so saving one doesn't show the others as saving
  const [timeZoneState, dispatchTimeZone, savingTimeZone] = useActionState(
    submitCompanySettings,
    initialActionState,
  );
  const [currencyState, dispatchCurrency, savingCurrency] = useActionState(
    submitCompanySettings,
    initialActionState,
  );
  const [budgetState, dispatchBudget, savingBudget] = useActionState(
    submitCompanySettings,
    initialActionState,
  );
  useActionNotice(timeZoneState);
  useActionNotice(currencyState);
  useActionNotice(budgetState);
  const deviceTimeZone = useDeviceTimeZone();

  const save = (value: string) => {
    const formData = new FormData();
    formData.set("timezone", value);
    startTransition(() => dispatchTimeZone(formData));
  };

  const handleCurrency = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const chosen = String(formData.get("currency"));
    if (
      chosen === currency ||
      !window.confirm(fill(t.confirmCurrency, { to: chosen, from: currency }))
    ) {
      return;
    }
    startTransition(() => dispatchCurrency(formData));
  };

  const handleBudget = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatchBudget(formData));
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
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: { name },
    });
    setRenaming(false);
    if (error) {
      notify({ type: "error", text: authErrorText(error, i18n, t.renameFailed) });
      return;
    }
    notify({ type: "success", text: fill(t.renamed, { name }) });
    // The name is also shown in the top bar and on other pages
    router.refresh();
  };

  return (
    <div className={shared.stack}>
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.name}</h2>
          <p className={shared.cardHint}>{t.nameHint}</p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleRename}>
            <Input
              name="name"
              aria-label={t.name}
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
              text={saveText(renaming)}
              disabled={renaming}
            />
          </form>
        ) : (
          <p className={styles.current}>{organization.name}</p>
        )}
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.timezone}</h2>
          <p className={shared.cardHint}>{t.timezoneHint}</p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <Select
              name="timezone"
              aria-label={t.timezone}
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
              loading={savingTimeZone}
              text={saveText(savingTimeZone)}
              disabled={savingTimeZone}
            />
          </form>
        ) : (
          <p className={styles.current}>{timeZone.replaceAll("_", " ")}</p>
        )}
        {canManage && deviceTimeZone && deviceTimeZone !== timeZone && (
          <p className={styles.hint}>
            {fill(t.deviceTimezone, { zone: deviceTimeZone.replaceAll("_", " ") })}{" "}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => save(deviceTimeZone)}
              disabled={savingTimeZone}
            >
              {t.useDevice}
            </button>
          </p>
        )}
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.currency}</h2>
          <p className={shared.cardHint}>{t.currencyHint}</p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleCurrency}>
            <Select
              name="currency"
              aria-label={t.currency}
              // Re-select the saved value after it changes
              key={currency}
              defaultValue={currency}
              className={styles.timezone}
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} – {currencyName(code, intlLocale(locale))}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingCurrency}
              text={saveText(savingCurrency)}
              disabled={savingCurrency}
            />
          </form>
        ) : (
          <p className={styles.current}>
            {currency}
            {currency in CURRENCIES && ` – ${currencyName(currency, intlLocale(locale))}`}
          </p>
        )}
      </section>

      <section className={shared.card} id="budget">
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.budget}</h2>
          <p className={shared.cardHint}>{t.budgetHint}</p>
        </div>
        {canManage ? (
          <form className={styles.form} onSubmit={handleBudget}>
            <Input
              name="overallBudget"
              type="number"
              aria-label={fill(t.budgetLabel, { currency })}
              {...amountInputProps(currency)}
              placeholder={t.noBudget}
              // Show the saved amount after it changes
              key={monthlyBudget ?? "none"}
              defaultValue={monthlyBudget ?? ""}
              className={styles.timezone}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={savingBudget}
              text={saveText(savingBudget)}
              disabled={savingBudget}
            />
          </form>
        ) : (
          <p className={styles.current}>
            {monthlyBudget === null
              ? t.none
              : fill(t.perMonth, { amount: formatCurrency(monthlyBudget, { currency }, locale) })}
          </p>
        )}
      </section>
    </div>
  );
}
