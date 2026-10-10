// ─────────────────────────────────────────────────────────────────────────────
// Import a bank statement window
//
// In plain words: most banks let you download your transactions as a CSV
// file. Here you pick that file and the account it belongs to. Finely guesses
// which column holds the date, description and amount (you can correct it),
// shows a preview of what will be imported — and which lines can't be, and
// why — and then adds all of them at once. Lines already in the account are
// skipped, so importing the same file twice doesn't create duplicates.
//
// For developers: a client component ("use client") inside the shared
// Dialog, opened by ?import=1. The file is read and previewed entirely in
// the browser (utils/csv.ts, lib/statement-import.ts); only the resulting
// rows are sent to the importStatement server action, which checks them
// again and redirects back to the list with the result.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { FileUp } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
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
} from "@/lib/statement-import";
import type { Account, Category } from "@/types/finance";
import { parseCsv } from "@/utils/csv";
import { formatCurrency, formatDate } from "@/utils/format";
import forms from "./forms.module.css";
import styles from "./ImportDialog.module.css";

// Bank statements are small; anything bigger is probably the wrong file
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 8;

interface ImportDialogProps {
  accounts: Account[];
  categories: Category[];
  /** The list's address, to return to when the window closes */
  closeHref: string;
}

export default function ImportDialog(props: ImportDialogProps) {
  const [pending, startImport] = useTransition();
  return (
    <Dialog
      title="Import a bank statement"
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
  accounts,
  categories,
  pending,
  startImport,
}: ImportFormProps) {
  const close = useCloseDialog();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  // The chosen file's name and its lines, split into cells
  const [file, setFile] = useState<{ name: string; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still works
    if (!chosen) return;
    setError(null);
    if (chosen.size > MAX_FILE_BYTES) {
      setError("This file is too large for a bank statement (over 5 MB).");
      return;
    }
    const rows = parseCsv(await chosen.text());
    if (rows.length === 0) {
      setError("This file is empty.");
      return;
    }
    if (rows.length > MAX_IMPORT_ROWS + 1) {
      setError(
        `This file has more than ${MAX_IMPORT_ROWS} lines. Split it into smaller files.`,
      );
      return;
    }
    setFile({ name: chosen.name, rows });
    setMapping(guessMapping(rows));
  };

  // Step 1: choose the account and the file
  if (!file || !mapping) {
    return (
      <div className={forms.form}>
        <p className={styles.intro}>
          Download your transactions from your bank&apos;s website as a CSV
          file, then choose it here. You&apos;ll see a preview before anything
          is imported.
        </p>
        {error && (
          <Message type="error">
            {error}
          </Message>
        )}
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
        <label className={styles.dropZone}>
          <FileUp size={24} />
          <span className={styles.dropTitle}>Choose a CSV file</span>
          <span className={styles.dropHint}>
            Up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} transactions
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
            <Button variant="outline" size="sm" text="Cancel" action={close} />
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
    const name = header[i] || columnLetter(i);
    const example = firstLine[i] ? ` (e.g. ${firstLine[i].slice(0, 24)})` : "";
    return { value: i, label: name + example };
  });

  const { rows, problems } = interpretRows(file.rows, mapping);
  const knownCategories = new Set(categories.map((c) => c.name.toLowerCase()));
  const totalIn = rows.reduce((sum, r) => (r.amount > 0 ? sum + r.amount : sum), 0);
  const totalOut = rows.reduce((sum, r) => (r.amount < 0 ? sum + r.amount : sum), 0);

  const handleImport = () => {
    setError(null);
    startImport(async () => {
      // On success the server goes back to the list, so this only returns
      // when something went wrong
      const result = await importStatement(accountId, rows);
      if (result?.error) setError(result.error);
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
            setError(null);
          }}
          disabled={pending}
        >
          Choose another file
        </button>
      </div>

      {error && (
        <Message type="error">
          {error}
        </Message>
      )}

      <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />

      {/* Which column holds what */}
      <fieldset className={styles.mapping} disabled={pending}>
        <legend>Columns</legend>
        <label className={forms.checkbox}>
          <input
            type="checkbox"
            checked={mapping.hasHeader}
            onChange={(e) => update({ hasHeader: e.target.checked })}
          />
          The first line has column names
        </label>
        <div className={forms.grid}>
          <ColumnSelect
            label="Date"
            columns={columns}
            value={mapping.date}
            onChange={(date) => update({ date })}
          />
          <Field label="Date format">
            <Select
              value={mapping.dateFormat}
              onChange={(e) => update({ dateFormat: e.target.value as DateFormat })}
            >
              {Object.entries(DATE_FORMATS).map(([value, example]) => (
                <option key={value} value={value}>
                  {example}
                </option>
              ))}
            </Select>
          </Field>
          <ColumnSelect
            label="Description"
            columns={columns}
            value={mapping.name}
            onChange={(name) => update({ name })}
          />
          <ColumnSelect
            label="Category"
            optional
            columns={columns}
            value={mapping.category}
            onChange={(category) => update({ category })}
          />
          <Field label="Amounts">
            <Select
              value={mapping.amountMode}
              onChange={(e) =>
                update({ amountMode: e.target.value as ColumnMapping["amountMode"] })
              }
            >
              <option value="single">One column (minus = money out)</option>
              <option value="split">Separate money in and out columns</option>
            </Select>
          </Field>
          {mapping.amountMode === "single" ? (
            <ColumnSelect
              label="Amount"
              columns={columns}
              value={mapping.amount}
              onChange={(amount) => update({ amount })}
            />
          ) : (
            <div className={styles.pair}>
              <ColumnSelect
                label="Money in"
                columns={columns}
                value={mapping.moneyIn}
                onChange={(moneyIn) => update({ moneyIn })}
              />
              <ColumnSelect
                label="Money out"
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
          Money out is shown as positive numbers (common for credit cards)
        </label>
      </fieldset>

      {/* What will be imported */}
      <div className={styles.summary}>
        <strong>
          {rows.length} {rows.length === 1 ? "transaction" : "transactions"} ready
        </strong>
        {rows.length > 0 && (
          <span>
            <span className={styles.income}>{formatCurrency(totalIn, { signed: true })}</span>
            {" in · "}
            {formatCurrency(totalOut, { signed: true })} out
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col" className={styles.amount}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <tr key={i}>
                  <td>{formatDate(row.date)}</td>
                  <td className={styles.name}>{row.name}</td>
                  <td className={styles.muted}>
                    {row.category && knownCategories.has(row.category.toLowerCase())
                      ? row.category
                      : "Uncategorized"}
                  </td>
                  <td className={`${styles.amount} ${row.amount > 0 ? styles.income : ""}`}>
                    {formatCurrency(row.amount, { signed: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_ROWS && (
            <p className={styles.more}>…and {rows.length - PREVIEW_ROWS} more</p>
          )}
        </div>
      )}

      {/* Lines that will be left out, and why */}
      {problems.length > 0 && (
        <div className={styles.problems}>
          <strong>
            {problems.length} {problems.length === 1 ? "line" : "lines"} will be
            skipped
          </strong>
          <ul>
            {problems.slice(0, 5).map((p) => (
              <li key={p.line}>
                Line {p.line}: {p.message}
              </li>
            ))}
            {problems.length > 5 && <li>…and {problems.length - 5} more</li>}
          </ul>
        </div>
      )}

      <p className={styles.note}>
        Transactions already in this account (same date, amount and
        description) will be skipped.
      </p>

      <div className={forms.footer}>
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text="Cancel"
            action={close}
            disabled={pending}
          />
          <Button
            variant="primary"
            size="sm"
            loading={pending}
            text={
              pending
                ? "Importing"
                : `Import ${rows.length} ${rows.length === 1 ? "transaction" : "transactions"}`
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
  return (
    <Field label="Import into">
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
  return (
    <Field label={label} optional={optional}>
      <Select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        <option value={-1}>{optional ? "None" : "Choose a column"}</option>
        {columns.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
