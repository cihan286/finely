// ─────────────────────────────────────────────────────────────────────────────
// Password rules
//
// In plain words: how short or long a password may be. The sign-up and
// "choose a new password" forms use these to check passwords and show the
// "At least 8 characters" hint.
// ─────────────────────────────────────────────────────────────────────────────

// Better Auth's default password limits; keep in sync if lib/auth.ts changes them
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
