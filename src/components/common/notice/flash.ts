// What both sides need to know about a notice kept for the next page
// (lib/flash-notice.ts sets it, NoticeProvider shows it)

export type NoticeType = "success" | "error" | "info";

export const FLASH_COOKIE = "finely-notice";
