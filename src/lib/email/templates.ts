// ─────────────────────────────────────────────────────────────────────────────
// Email templates
//
// In plain words: the wording and look of every email Finely sends — password
// reset, "verify your email address" and team invitations. Each email has a
// designed version and a plain-text version.
//
// For developers: emails can't use our CSS files, so styles are written inline,
// and buttons are built from tables so they also work in Outlook. Anything a
// user typed (names, company names) MUST go through escapeHtml(): otherwise
// someone could name their company with HTML and turn our invitation emails
// into convincing phishing.
// ─────────────────────────────────────────────────────────────────────────────

import type { Email } from "./send";

// Brand colors, matching the design tokens in globals.css
const BLUE = "#2196f3";
const TEXT = "#171717";
const MUTED = "#666666";

/** Makes user-typed text safe to put inside HTML */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutParts {
  /** Short summary some email apps show next to the subject */
  preview: string;
  heading: string;
  /** Paragraphs of HTML (already escaped) */
  paragraphs: string[];
  button: { label: string; url: string };
  /** Small print under the button */
  footnote: string;
}

// The shared frame of every email: logo, heading, text, button, small print
function layout({ preview, heading, paragraphs, button, footnote }: LayoutParts): string {
  const url = escapeHtml(button.url);
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:${TEXT};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
<tr><td style="font-size:22px;font-weight:bold;color:${BLUE};padding-bottom:24px;">Finely</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px;">${escapeHtml(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:12px;">${p}</td></tr>`).join("\n")}
<tr><td style="padding:12px 0 20px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${BLUE};border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(button.label)}</a>
</td></tr></table>
</td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:${MUTED};">${footnote}<br><br>If the button doesn't work, copy this link into your browser:<br><a href="${url}" style="color:${BLUE};word-break:break-all;">${url}</a></td></tr>
</table>
<p style="font-size:12px;color:${MUTED};margin-top:16px;">Finely – Financial clarity for modern businesses</p>
</td></tr>
</table>
</body>
</html>`;
}

/** Removes line breaks and other control characters (for subject lines) */
const oneLine = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

/** "Maya Carter" -> "Maya" (for greetings) */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

// ---------------------------------------------------------------- password reset

export function passwordResetEmail(to: string, name: string, url: string): Email {
  const hi = escapeHtml(firstName(name));
  return {
    to,
    subject: "Reset your Finely password",
    html: layout({
      preview: "Use this link to choose a new password.",
      heading: "Reset your password",
      paragraphs: [
        `Hi ${hi},`,
        "We received a request to reset the password for your Finely account. Click the button below to choose a new one.",
      ],
      button: { label: "Choose a new password", url },
      footnote:
        "This link works once and expires in one hour. If you didn't ask to reset your password, you can ignore this email — your password won't change.",
    }),
    text: `Hi ${firstName(name)},

We received a request to reset the password for your Finely account. Open this link to choose a new one:

${url}

This link works once and expires in one hour. If you didn't ask to reset your password, you can ignore this email.`,
  };
}

// ---------------------------------------------------------------- email verification

export function verifyEmailEmail(to: string, name: string, url: string): Email {
  const hi = escapeHtml(firstName(name));
  return {
    to,
    subject: "Verify your email for Finely",
    html: layout({
      preview: "Confirm this is your email address.",
      heading: "Verify your email address",
      paragraphs: [
        `Hi ${hi},`,
        "Welcome to Finely! Please confirm that this is your email address. You'll need a verified email to join teams.",
      ],
      button: { label: "Verify email address", url },
      footnote:
        "This link expires in one hour. If you didn't create a Finely account, you can ignore this email.",
    }),
    text: `Hi ${firstName(name)},

Welcome to Finely! Please confirm that this is your email address by opening this link:

${url}

This link expires in one hour. If you didn't create a Finely account, you can ignore this email.`,
  };
}

// ---------------------------------------------------------------- team invitation

interface InvitationDetails {
  to: string;
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  role: string;
  url: string;
}

export function invitationEmail(d: InvitationDetails): Email {
  const org = escapeHtml(d.organizationName);
  const inviter = escapeHtml(d.inviterName);
  const inviterEmail = escapeHtml(d.inviterEmail);
  const article = /^[aeiou]/i.test(d.role) ? "an" : "a";
  return {
    to: d.to,
    subject: oneLine(`${d.inviterName} invited you to join ${d.organizationName} on Finely`),
    html: layout({
      preview: `Join ${d.organizationName} on Finely.`,
      heading: `Join ${d.organizationName} on Finely`,
      paragraphs: [
        `<strong>${inviter}</strong> (${inviterEmail}) invited you to join <strong>${org}</strong> on Finely as ${article} ${escapeHtml(d.role)}.`,
        "Finely gives your team one clear view of the company's cash flow, expenses and bills.",
      ],
      button: { label: "Accept invitation", url: d.url },
      footnote:
        "This invitation expires in 48 hours. If you weren't expecting it, you can ignore this email.",
    }),
    text: `${d.inviterName} (${d.inviterEmail}) invited you to join ${d.organizationName} on Finely as ${article} ${d.role}.

Accept the invitation here:

${d.url}

This invitation expires in 48 hours. If you weren't expecting it, you can ignore this email.`,
  };
}
