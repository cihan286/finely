// ─────────────────────────────────────────────────────────────────────────────
// Attachments: which files are accepted
//
// In plain words: a receipt or invoice can be added to a transaction as a
// PDF or a picture. This decides which files are allowed (how big, how many,
// what kind) and tells what kind a file really is by looking at its first
// bytes, not at its name.
//
// For developers: pure functions, unit-tested in attachments.test.ts; safe
// to use in the browser and on the server. The kind is taken from the
// content ("magic bytes") because the name and the type the browser reports
// can say anything. Only kinds a browser shows without running anything are
// accepted: no HTML, no SVG, no office documents.
// ─────────────────────────────────────────────────────────────────────────────

/** The largest file accepted: Vercel refuses requests over 4.5 MB */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

/** The most files one transaction can have */
export const MAX_ATTACHMENTS_PER_TRANSACTION = 10;

/** The kinds of file accepted, with the name shown on screen */
export const ATTACHMENT_TYPES = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
} as const;
export type AttachmentType = keyof typeof ATTACHMENT_TYPES;

/** For the file picker: what it offers */
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(",");

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

/** The kind of file these bytes are, or null if it isn't one we accept */
export function detectAttachmentType(bytes: Uint8Array): AttachmentType | null {
  // "%PDF-"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // "RIFF" …size… "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * A file's name made safe to store and to send back as a download name:
 * no folders, no control characters, not too long. "" becomes "attachment".
 */
export function cleanFileName(name: string): string {
  const base = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim();
  if (base.length <= 120) return base || "attachment";
  // Keep the ending (".pdf") when shortening
  const dot = base.lastIndexOf(".");
  const ending = dot > 0 && base.length - dot <= 10 ? base.slice(dot) : "";
  return base.slice(0, 120 - ending.length) + ending;
}

/** 2048 -> "2 KB", 1572864 -> "1.5 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
