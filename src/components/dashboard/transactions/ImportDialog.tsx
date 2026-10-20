// ─────────────────────────────────────────────────────────────────────────────
// Import a bank statement window
//
// In plain words: most banks let you download your transactions as a CSV
// file. Here you pick that file and the account it belongs to. Finely guesses
// which column holds the date, description and amount (you can correct it),
// shows a preview of what will be imported, with the category each line
// will get — and which lines can't be imported, and why — and then adds all
// of them at once. Lines already in the account are
// skipped, so importing the same file twice doesn't create duplicates.
//
// For developers: a client component ("use client") inside the shared
// Dialog, opened by ?import=1. The file is read and previewed entirely in
// the browser (lib/finance/csv.ts, lib/finance/statement-import.ts); only
// the resulting rows are sent to the importStatement server action, which
// checks them again and redirects back to the list with the result.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { FileUp } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Select } from "@/components/common/form/controls";
import { useNotify } from "@/components/common/notice/Notice";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import { importStatement } from "@/app/dashboard/transactions/actions";
import {
  columnLetter,
  DATE_FORMATS,
  guessMapping,
  interpretRows,
  MAX_IMPORT_ROWS,
  type ColumnMapping,
  type DateFormat,
} from "@/lib/finance/statement-import";
import { categoryFromRules } from "@/lib/finance/category-rules";
import type { Account, Category, CategoryRule } from "@/types/finance";
import { parseCsv } from "@/lib/finance/csv";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { fill, plural } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import forms from "./forms.module.css";
import styles from "./ImportDialog.module.css";

// Bank statements are small; anything bigger is probably the wrong file
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 8;

interface ImportDialogProps {
  /** The company's currency, e.g. "USD" */
  currency: string;
  accounts: Account[];
  categories: Category[];
  /** The company's category rules, to preview which category each line gets */
  rules: CategoryRule[];
  /** The list's address, to return to when the window closes */
  closeHref: string;
}

export default function ImportDialog(props: ImportDialogProps) {
  const t = useI18n().m.transactions.import;
  const [pending, startImport] = useTransition();
  return (
    <Dialog
      title={t.title}
      closeHref={props.closeHref}
      busy={pending}
      size="lg"
    >
      <ImportForm {...props} pending={pending} startImport={startImport} />
    </Dialog>
  );
}

interface ImportFormProps extends ImportDialogProps {
  pending: boolean;
  startImport: (action: () => Promise<void>) => void;
}

// The window's content (separate so its Cancel button can close it)
function ImportForm({
  currency,
  accounts,
  categories,
  rules,
  pending,
  startImport,
}: ImportFormProps) {
  const close = useCloseDialog();
  const { locale, m } = useI18n();
  const words = m.transactions;
  const t = words.import;
  const money = (value: number) => formatCurrency(value, { signed: true, currency }, locale);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  // The chosen file's name and its lines, split into cells
  const [file, setFile] = useState<{ name: string; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const notify = useNotify();
  const showError = (text: string) => notify({ type: "error", text });

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still works
    if (!chosen) return;
    if (chosen.size > MAX_FILE_BYTES) {
      showError(t.tooLarge);
      return;
    }
    const rows = parseCsv(await chosen.text());
    if (rows.length === 0) {
      showError(t.empty);
      return;
    }
    if (rows.length > MAX_IMPORT_ROWS + 1) {
      showError(fill(t.tooManyLines, { max: MAX_IMPORT_ROWS }));
      return;
    }
    setFile({ name: chosen.name, rows });
    setMapping(guessMapping(rows));
  };

  // Step 1: choose the account and the file
  if (!file || !mapping) {
    return (
      <div className={forms.form}>
        <p className={styles.intro}>{t.intro}</p>
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
        <label className={styles.dropZone}>
          <FileUp size={24} />
          <span className={styles.dropTitle}>{t.chooseFile}</span>
          <span className={styles.dropHint}>
            {fill(t.upTo, { max: formatNumber(MAX_IMPORT_ROWS, locale) })}
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className={forms.srOnly}
          />
        </label>
        <div className={forms.footer}>
          <div className={forms.footerRight}>
            <Button variant="outline" size="sm" text={m.common.cancel} action={close} />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: check the columns, preview, import
  const update = (changes: Partial<ColumnMapping>) =>
    setMapping({ ...mapping, ...changes });

  const header = mapping.hasHeader ? file.rows[0] : [];
  const firstLine = file.rows[mapping.hasHeader ? 1 : 0] ?? [];
  const columnCount = Math.max(...file.rows.slice(0, 20).map((r) => r.length));
  // "Amount (e.g. -8204.00)" or "Column C (e.g. -8204.00)"
  const columns = Array.from({ length: columnCount }, (_, i) => {
    const name = header[i] || fill(t.column, { letters: columnLetter(i) });
    const label = firstLine[i]
      ? fill(t.example, { column: name, value: firstLine[i].slice(0, 24) })
      : name;
    return { value: i, label };
  });

  const { rows, problems } = interpretRows(file.rows, mapping);
  // The category each line will get, as the server decides it on import:
  // the file's own category if we know it, otherwise what the rules say
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.name]));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const categoryOf = (row: (typeof rows)[number]) => {
    const fromFile = row.category && categoryByName.get(row.category.toLowerCase());
    if (fromFile) return fromFile;
    const fromRules = categoryFromRules(row.name, rules);
    return (fromRules && categoryById.get(fromRules)) ?? null;
  };
  const uncategorized = rows.filter((row) => categoryOf(row) === null).length;
  const totalIn = rows.reduce((sum, r) => (r.amount > 0 ? sum + r.amount : sum), 0);
  const totalOut = rows.reduce((sum, r) => (r.amount < 0 ? sum + r.amount : sum), 0);

  const handleImport = () => {
    startImport(async () => {
      // On success the server goes back to the list, so this only returns
      // when something went wrong
      const result = await importStatement(accountId, rows);
      if (result?.error) showError(result.error);
    });
  };

  return (
    <div className={forms.form}>
      <div className={styles.fileRow}>
        <span className={styles.fileName}>{file.name}</span>
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => {
            setFile(null);
            setMapping(null);
          }}
          disabled={pending}
        >
          {t.chooseAnother}
        </button>
      </div>

      <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />

      {/* Which column holds what */}
      <fieldset className={styles.mapping} disabled={pending}>
        <legend>{t.columns}</legend>
        <label className={forms.checkbox}>
          <input
            type="checkbox"
            checked={mapping.hasHeader}
            onChange={(e) => update({ hasHeader: e.target.checked })}
          />
          {t.hasHeader}
        </label>
        <div className={forms.grid}>
          <ColumnSelect
            label={t.date}
            columns={columns}
            value={mapping.date}
            onChange={(date) => update({ date })}
          />
          <Field label={t.dateFormat}>
            <Select
              value={mapping.dateFormat}
              onChange={(e) => update({ dateFormat: e.target.value as DateFormat })}
            >
              {(Object.keys(DATE_FORMATS) as DateFormat[]).map((value) => (
                <option key={value} value={value}>
                  {t.dateFormats[value]}
                </option>
              ))}
            </Select>
          </Field>
          <ColumnSelect
            label={t.description}
            columns={columns}
            value={mapping.name}
            onChange={(name) => update({ name })}
          />
          <ColumnSelect
            label={t.category}
            optional
            columns={columns}
            value={mapping.category}
            onChange={(category) => update({ category })}
          />
          <Field label={t.amounts}>
            <Select
              value={mapping.amountMode}
              onChange={(e) =>
                update({ amountMode: e.target.value as ColumnMapping["amountMode"] })
              }
            >
              <option value="single">{t.oneColumn}</option>
              <option value="split">{t.twoColumns}</option>
            </Select>
          </Field>
          {mapping.amountMode === "single" ? (
            <ColumnSelect
              label={t.amount}
              columns={columns}
              value={mapping.amount}
              onChange={(amount) => update({ amount })}
            />
          ) : (
            <div className={styles.pair}>
              <ColumnSelect
                label={t.moneyIn}
                columns={columns}
                value={mapping.moneyIn}
                onChange={(moneyIn) => update({ moneyIn })}
              />
              <ColumnSelect
                label={t.moneyOut}
                columns={columns}
                value={mapping.moneyOut}
                onChange={(moneyOut) => update({ moneyOut })}
              />
            </div>
          )}
        </div>
        <label className={forms.checkbox}>
          <input
            type="checkbox"
            checked={mapping.flipSign}
            onChange={(e) => update({ flipSign: e.target.checked })}
          />
          {t.flipSign}
        </label>
      </fieldset>

      {/* What will be imported */}
      <div className={styles.summary}>
        <strong>{plural(rows.length, t.ready)}</strong>
        {rows.length > 0 && (
          <span>
            {rich(fill(t.totals, { in: money(totalIn), out: money(totalOut) }), {
              income: (text) => <span className={styles.income}>{text}</span>,
            })}
            {uncategorized > 0 && ` · ${fill(t.uncategorized, { count: uncategorized })}`}
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t.date}</th>
                <th scope="col">{t.description}</th>
                <th scope="col">{t.category}</th>
                <th scope="col" className={styles.amount}>
                  {t.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i}>
                  <td>{formatDate(row.date, locale)}</td>
                  <td className={styles.name}>{row.name}</td>
                  <td className={styles.muted}>
                    {categoryOf(row) ?? words.uncategorized}
                  </td>
                  <td className={`${styles.amount} ${row.amount > 0 ? styles.income : ""}`}>
                    {money(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_ROWS && (
            <p className={styles.more}>{fill(t.andMore, { count: rows.length - PREVIEW_ROWS })}</p>
          )}
        </div>
      )}

      {/* Lines that will be left out, and why */}
      {problems.length > 0 && (
        <div className={styles.problems}>
          <strong>{plural(problems.length, t.skippedLines)}</strong>
          <ul>
            {problems.slice(0, 5).map((p) => (
              <li key={p.line}>
                {fill(t.line, {
                  line: p.line,
                  message: fill(t.problems[p.problem], { value: p.value ?? "" }),
                })}
              </li>
            ))}
            {problems.length > 5 && <li>{fill(t.andMore, { count: problems.length - 5 })}</li>}
          </ul>
        </div>
      )}

      <p className={styles.note}>{t.duplicatesNote}</p>

      <div className={forms.footer}>
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text={m.common.cancel}
            action={close}
            disabled={pending}
          />
          <Button
            variant="primary"
            size="sm"
            loading={pending}
            text={
              pending ? t.importing : plural(rows.length, t.importCount)
            }
            action={handleImport}
            disabled={pending || rows.length === 0 || !accountId}
          />
        </div>
      </div>
    </div>
  );
}

// Which account the statement belongs to
function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
}) {
  const t = useI18n().m.transactions.import;
  return (
    <Field label={t.importInto}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.last4 ? ` ••${a.last4}` : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
}

// A dropdown of the file's columns
function ColumnSelect({
  label,
  columns,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  columns: { value: number; label: string }[];
  value: number;
  onChange: (column: number) => void;
  optional?: boolean;
}) {
  const t = useI18n().m.transactions.import;
  return (
    <Field label={label} optional={optional}>
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        <option value={-1}>{optional ? t.none : t.chooseColumn}</option>
        {columns.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
