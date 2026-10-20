// ─────────────────────────────────────────────────────────────────────────────
// Receipts and attachments of a transaction
//
// In plain words: the part of the edit window that lists the files attached
// to a transaction (receipts, invoices), each with a link to open it, and a
// button to add another. Files are saved as soon as they're chosen; they
// don't wait for "Save changes".
//
// For developers: a client component ("use client"). It sits outside the
// transaction's <form>, so a chosen file isn't sent again when the
// transaction is saved. Adding and deleting call server actions that answer
// with the transaction's files, which replace the list shown. The size and
// kind are checked here for a quick answer, and again on the server.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useNotify } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import Spinner from "@/components/common/spinner/Spinner";
import {
  removeAttachment,
  uploadAttachment,
} from "@/app/dashboard/transactions/actions";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_TYPES,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TRANSACTION,
} from "@/lib/finance/attachments";
import type { Attachment } from "@/types/finance";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import styles from "./Attachments.module.css";

const FILE_PATH = "/dashboard/transactions/attachments";

interface AttachmentsProps {
  transactionId: string;
  /** The files attached when the window opened */
  initial: Attachment[];
}

export default function Attachments({ transactionId, initial }: AttachmentsProps) {
  const { locale, m } = useI18n();
  const t = m.transactions.attachments;
  const [attachments, setAttachments] = useState(initial);
  const notify = useNotify();
  const confirm = useConfirm();
  const showError = (text: string) => notify({ type: "error", text });
  // What is being saved: "upload", or the ID of the file being deleted
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const full = attachments.length >= MAX_ATTACHMENTS_PER_TRANSACTION;

  // Runs an action and shows its answer
  const run = (
    key: string,
    action: () => Promise<{ error: string | null; attachments?: Attachment[] }>,
    success: string,
  ) => {
    setBusy(key);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (result.error) {
        showError(result.error);
        return;
      }
      if (result.attachments) setAttachments(result.attachments);
      notify({ type: "success", text: success });
    });
  };

  const handleChoose = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // So choosing the same file again counts as a change
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showError(
        fill(t.tooLarge, {
          max: formatFileSize(MAX_ATTACHMENT_BYTES, locale),
          size: formatFileSize(file.size, locale),
        }),
      );
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    run(
      "upload",
      () => uploadAttachment(transactionId, formData),
      fill(t.added, { name: file.name }),
    );
  };

  const handleDelete = async (attachment: Attachment) => {
    const text = fill(t.confirmDelete, { name: attachment.name });
    if (!(await confirm({ text, confirmText: m.common.delete, danger: true }))) return;
    run(
      attachment.id,
      () => removeAttachment(attachment.id),
      fill(t.removed, { name: attachment.name }),
    );
  };

  return (
    <section className={styles.section} aria-label={t.label}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t.title}</h3>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null || full}
        >
          {busy === "upload" ? <Spinner size={14} /> : <Paperclip size={14} />}
          {busy === "upload" ? t.uploading : t.add}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className={styles.fileInput}
          onChange={handleChoose}
          aria-label={t.choose}
          tabIndex={-1}
        />
      </div>

      {attachments.length === 0 ? (
        <p className={styles.hint}>
          {fill(t.nothing, {
            types: Object.values(ATTACHMENT_TYPES).join(", "),
            size: formatFileSize(MAX_ATTACHMENT_BYTES, locale),
          })}
        </p>
      ) : (
        <ul className={styles.list}>
          {attachments.map((attachment) => (
            <li key={attachment.id} className={styles.item}>
              {attachment.contentType.startsWith("image/") ? (
                // The picture itself, small; the name next to it opens it
                // eslint-disable-next-line @next/next/no-img-element -- a private file from our own route, not something to optimize or cache
                <img
                  src={`${FILE_PATH}/${attachment.id}`}
                  alt=""
                  loading="lazy"
                  className={styles.thumbnail}
                />
              ) : (
                <span className={styles.icon} aria-hidden="true">
                  <FileText size={16} />
                </span>
              )}
              {/* Opens in a new tab; the page behind keeps what was typed */}
              <a
                href={`${FILE_PATH}/${attachment.id}`}
                target="_blank"
                rel="noreferrer"
                className={styles.name}
              >
                {attachment.name}
              </a>
              <span className={styles.size}>{formatFileSize(attachment.size, locale)}</span>
              {attachment.canDelete && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDelete(attachment)}
                  disabled={busy !== null}
                  aria-label={fill(t.delete, { name: attachment.name })}
                >
                  {busy === attachment.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {full && (
        <p className={styles.hint}>{fill(t.full, { max: MAX_ATTACHMENTS_PER_TRANSACTION })}</p>
      )}
    </section>
  );
}
