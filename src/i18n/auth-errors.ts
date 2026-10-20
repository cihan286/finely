// ─────────────────────────────────────────────────────────────────────────────
// Languages: what went wrong when logging in, signing up or changing the team
//
// In plain words: the login library (Better Auth) answers in English. This
// turns its answer into a sentence in the page's language, by its code
// ("INVALID_EMAIL_OR_PASSWORD" -> "E-posta veya şifre hatalı.").
//
// For developers: safe in client components. Codes without a translation
// fall back to the library's own message in English, and to `fallback` in
// other languages.
// ─────────────────────────────────────────────────────────────────────────────

import type { Locale } from "./config";
import type { ClientMessages } from "./messages";

interface AuthError {
  code?: string;
  message?: string;
  status?: number;
}

export function authErrorText(
  error: AuthError,
  { locale, m }: { locale: Locale; m: ClientMessages },
  fallback: string,
): string {
  const errors: Record<string, string> = m.auth.errors;
  if (error.status === 429) return errors.TOO_MANY_REQUESTS;
  if (error.code === "DEMO_BLOCKED") return m.auth.demoBlocked;
  if (error.code && error.code in errors) return errors[error.code];
  return locale === "en" ? (error.message ?? fallback) : fallback;
}
