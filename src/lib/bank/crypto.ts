// ─────────────────────────────────────────────────────────────────────────────
// Locking away the keys to linked banks
//
// In plain words: when a company links its bank, the bank's service (Plaid)
// gives us a key that lets us read that bank's transactions. Anyone holding
// that key could read them too, so we never store it as it is: it's
// encrypted with a secret that isn't in the database (BANK_ENCRYPTION_KEY).
// A copy of the database alone is then useless for reading anyone's bank.
//
// For developers: AES-256-GCM with a random 12-byte IV per token; the stored
// text is "v1.<iv>.<tag>.<ciphertext>" (base64url). The 32-byte key is the
// SHA-256 of the secret, so the secret can be any long random text. Changing
// the secret makes every stored token unreadable: the banks would have to be
// linked again. Decrypting a token that was tampered with throws.
// ─────────────────────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

const keyFrom = (secret: string) => createHash("sha256").update(secret).digest();

/** Encrypts a bank access token for storing in the database. */
export function encryptToken(token: string, secret: string): string {
  if (!secret) throw new Error("The bank encryption secret is not set.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

/** Reads a token back. Throws if it was changed or the secret is another one. */
export function decryptToken(stored: string, secret: string): string {
  if (!secret) throw new Error("The bank encryption secret is not set.");
  const [version, iv, tag, encrypted] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("The stored bank token is not readable.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFrom(secret),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
