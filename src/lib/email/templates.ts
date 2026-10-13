// ─────────────────────────────────────────────────────────────────────────────
// Email templates
//
// In plain words: the wording and look of every email Finely sends — password
// reset, "verify your email address", team invitations, the weekly summary,
// the alert for an unusually high charge, and the notes about a company
// being handed over or deleted, a failed payment and an account being
// deleted — plus the plain email we get ourselves when
// someone fills in the contact form. Each email has a designed version and
// a plain-text version.
//
// For developers: emails can't use our CSS files, so styles are written inline,
// and buttons are built from tables so they also work in Outlook. Anything a
// user typed (names, company names) MUST go through escapeHtml(): otherwise
// someone could name their company with HTML and turn our invitation emails
// into convincing phishing.
// ─────────────────────────────────────────────────────────────────────────────

import { appUrl } from "@/lib/app-url";
import type { ContactMessage } from "@/lib/contact";
import type { Digest } from "@/lib/finance/digest";
import type { UnusualCharge } from "@/lib/finance/insights";
import { formatCurrency, formatDate } from "@/lib/format";
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

// ---------------------------------------------------------------- handover and deletion

/** Sent to the person a company was just handed over to */
export function ownershipTransferredEmail(
  to: { name: string; email: string },
  organizationName: string,
  formerOwnerName: string,
): Email {
  const url = `${appUrl}/dashboard/settings`;
  return {
    to: to.email,
    subject: oneLine(`You now own ${organizationName} on Finely`),
    html: layout({
      preview: `${formerOwnerName} handed ${organizationName} over to you.`,
      heading: `You now own ${organizationName}`,
      paragraphs: [
        `Hi ${escapeHtml(firstName(to.name))},`,
        `<strong>${escapeHtml(formerOwnerName)}</strong> handed <strong>${escapeHtml(organizationName)}</strong> over to you on Finely. They are now an admin.`,
        "As the owner you manage the plan and billing, and only you can hand the company over or delete it.",
      ],
      button: { label: "Open settings", url },
      footnote: "If you weren't expecting this, talk to the person who handed it over.",
    }),
    text: `Hi ${firstName(to.name)},

${formerOwnerName} handed ${organizationName} over to you on Finely. They are now an admin.

As the owner you manage the plan and billing, and only you can hand the company over or delete it.

${url}

If you weren't expecting this, talk to the person who handed it over.`,
  };
}

/** Sent to everyone else on the team when the owner deleted the company */
export function companyDeletedEmail(
  to: { name: string; email: string },
  organizationName: string,
  ownerName: string,
): Email {
  const url = `${appUrl}/dashboard`;
  return {
    to: to.email,
    subject: oneLine(`${organizationName} was deleted on Finely`),
    html: layout({
      preview: `${ownerName} deleted ${organizationName}.`,
      heading: `${organizationName} was deleted`,
      paragraphs: [
        `Hi ${escapeHtml(firstName(to.name))},`,
        `<strong>${escapeHtml(ownerName)}</strong>, the owner of <strong>${escapeHtml(organizationName)}</strong>, deleted the company on Finely. Its accounts, transactions, bills and files are gone, and it no longer appears when you log in.`,
        "Your own Finely account is untouched: other companies you belong to are still there, and you can set up a new one.",
      ],
      button: { label: "Open Finely", url },
      footnote: "Deleting a company can't be undone.",
    }),
    text: `Hi ${firstName(to.name)},

${ownerName}, the owner of ${organizationName}, deleted the company on Finely. Its accounts, transactions, bills and files are gone, and it no longer appears when you log in.

Your own Finely account is untouched: other companies you belong to are still there, and you can set up a new one.

${url}`,
  };
}

/** Sent to a company's owner when the payment for its plan failed */
export function paymentFailedEmail(
  to: { name: string; email: string },
  organizationName: string,
): Email {
  const url = `${appUrl}/dashboard/settings#billing`;
  return {
    to: to.email,
    subject: oneLine(`The payment for ${organizationName}'s Finely plan failed`),
    html: layout({
      preview: "Update the payment method to keep the plan.",
      heading: "A payment failed",
      paragraphs: [
        `Hi ${escapeHtml(firstName(to.name))},`,
        `The latest payment for <strong>${escapeHtml(organizationName)}</strong>'s plan on Finely didn't go through. The card may have expired or been declined.`,
        "Nothing changes right away: the plan stays while the payment is tried again over the coming days. If it keeps failing, the company goes back to the Free plan. Nobody is removed from the team, but nobody can be added beyond the Free plan's size.",
      ],
      button: { label: "Update the payment method", url },
      footnote:
        "Open “Manage billing” there. You get this email because you're the company's owner.",
    }),
    text: `Hi ${firstName(to.name)},

The latest payment for ${organizationName}'s plan on Finely didn't go through. The card may have expired or been declined.

Nothing changes right away: the plan stays while the payment is tried again over the coming days. If it keeps failing, the company goes back to the Free plan. Nobody is removed from the team, but nobody can be added beyond the Free plan's size.

Update the payment method under "Manage billing": ${url}

You get this email because you're the company's owner.`,
  };
}

/** Sent to someone who just deleted their own account */
export function accountDeletedEmail(to: { name: string; email: string }): Email {
  const url = `${appUrl}/contact`;
  return {
    to: to.email,
    subject: "Your Finely account was deleted",
    html: layout({
      preview: "Your account and your logins are gone.",
      heading: "Your account was deleted",
      paragraphs: [
        `Hi ${escapeHtml(firstName(to.name))},`,
        "As you asked, your Finely account was deleted, along with your logins, your email choices and your place in every company you were in. This is the last email you get from us.",
        "What you entered for a company stays with that company.",
      ],
      button: { label: "Contact us", url },
      footnote: "If this wasn't you, write to us right away.",
    }),
    text: `Hi ${firstName(to.name)},

As you asked, your Finely account was deleted, along with your logins, your email choices and your place in every company you were in. This is the last email you get from us.

What you entered for a company stays with that company.

If this wasn't you, write to us right away: ${url}`,
  };
}

// ---------------------------------------------------------------- unusual charge

// Where people choose which emails they get
const SETTINGS_URL = `${appUrl}/dashboard/settings#emails`;

interface Recipient {
  name: string;
  email: string;
}

/** The addresses that stop this kind of email (see lib/email/unsubscribe.ts) */
interface UnsubscribeLinks {
  pageUrl: string;
  postUrl: string;
}

// How an email that can be stopped ends: the small print as HTML and as
// text, and the headers that give email apps their own "Unsubscribe" button
function stoppable(why: string, links: UnsubscribeLinks | null | undefined) {
  if (!links) {
    const footnote = `${why} To stop these emails, open Settings → Email notifications in Finely.`;
    return {
      footnote: escapeHtml(footnote),
      text: `${footnote}\n${SETTINGS_URL}`,
      headers: undefined,
    };
  }
  return {
    footnote: `${escapeHtml(why)} <a href="${escapeHtml(links.pageUrl)}" style="color:${MUTED};">Unsubscribe</a>, or choose your emails in Settings → Email notifications.`,
    text: `${why}\nUnsubscribe: ${links.pageUrl}\nChoose your emails: ${SETTINGS_URL}`,
    headers: {
      "List-Unsubscribe": `<${links.postUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Sent right away when charges far above a vendor's usual were just added */
export function unusualChargeEmail(
  to: Recipient,
  organizationName: string,
  charges: UnusualCharge[],
  /** The company's currency, e.g. "USD" */
  currency: string,
  /** The addresses that stop these alerts for this person, if there are any */
  unsubscribe?: UnsubscribeLinks | null,
): Email {
  const one = charges.length === 1;
  const line = (c: UnusualCharge) =>
    `${c.name} charged ${formatCurrency(c.amount, { currency: currency })} on ${formatDate(c.day)}, ${c.percentAbove}% above its usual ${formatCurrency(c.usual, { currency: currency })}.`;
  const heading = one
    ? `Unusually high charge from ${charges[0].name}`
    : `${charges.length} unusually high charges`;
  const ending = stoppable(
    `You get this email because you're on ${organizationName}'s team in Finely.`,
    unsubscribe,
  );
  return {
    to: to.email,
    headers: ending.headers,
    subject: oneLine(`${heading} at ${organizationName}`),
    html: layout({
      preview: line(charges[0]),
      heading,
      paragraphs: [
        `Hi ${escapeHtml(firstName(to.name))},`,
        `${one ? "A charge" : "Some charges"} just added to <strong>${escapeHtml(organizationName)}</strong> ${one ? "is" : "are"} well above what ${one ? "that vendor" : "those vendors"} usually ${one ? "charges" : "charge"}:`,
        ...charges.map(
          (c) =>
            `<strong>${escapeHtml(c.name)}</strong> charged <strong>${formatCurrency(c.amount, { currency: currency })}</strong> on ${formatDate(c.day)}, ${c.percentAbove}% above its usual ${formatCurrency(c.usual, { currency: currency })}.`,
        ),
      ],
      button: {
        label: one ? "Review the transaction" : "Review the transactions",
        url: one
          ? `${appUrl}/dashboard/transactions?edit=${charges[0].id}`
          : `${appUrl}/dashboard/insights`,
      },
      footnote: ending.footnote,
    }),
    text: `Hi ${firstName(to.name)},

${one ? "A charge" : "Some charges"} just added to ${organizationName} ${one ? "is" : "are"} well above the usual:

${charges.map((c) => `- ${line(c)}`).join("\n")}

Review in Finely: ${appUrl}/dashboard/insights

${ending.text}`,
  };
}

// ---------------------------------------------------------------- weekly summary

/** The Monday email: one company's last seven days */
export function weeklyDigestEmail(
  to: Recipient,
  digest: Digest,
  /** The addresses that stop the summary for this person, if there are any */
  unsubscribe?: UnsubscribeLinks | null,
): Email {
  const org = digest.organizationName;
  const net = digest.moneyIn - digest.moneyOut;
  const bills = (count: number) => `${count} ${count === 1 ? "bill" : "bills"}`;

  const figures: [string, string][] = [
    ["Money in", formatCurrency(digest.moneyIn, { currency: digest.currency })],
    ["Money out", formatCurrency(digest.moneyOut, { currency: digest.currency })],
    ["Net", formatCurrency(net, { signed: true, currency: digest.currency })],
    ["In the bank now", formatCurrency(digest.balance, { currency: digest.currency })],
  ];
  // Plain sentences; names typed by people are escaped for the HTML version
  const attention: { text: string; html: string }[] = [];
  const note = (text: string, html = escapeHtml(text)) => attention.push({ text, html });
  if (digest.overdueBills.count > 0) {
    note(`${bills(digest.overdueBills.count)} overdue, ${formatCurrency(digest.overdueBills.amount, { currency: digest.currency })} in total.`);
  }
  if (digest.billsDueSoon.count > 0) {
    note(`${bills(digest.billsDueSoon.count)} due in the next 7 days, ${formatCurrency(digest.billsDueSoon.amount, { currency: digest.currency })} in total.`);
  }
  for (const b of digest.overBudget) {
    note(`${b.name} is ${formatCurrency(b.spent - b.budget, { currency: digest.currency })} over its ${formatCurrency(b.budget, { currency: digest.currency })} budget this month.`);
  }
  for (const c of digest.unusualCharges) {
    note(`${c.name} charged ${formatCurrency(c.amount, { currency: digest.currency })}, ${c.percentAbove}% above its usual ${formatCurrency(c.usual, { currency: digest.currency })}.`);
  }

  const period = `${formatDate(digest.from)} – ${formatDate(digest.to)}`;
  const ending = stoppable(
    `You get this email every week because you're on ${org}'s team in Finely.`,
    unsubscribe,
  );
  const cell = "padding:4px 0;font-size:15px;";

  const paragraphs = [
    `Hi ${escapeHtml(firstName(to.name))}, here's <strong>${escapeHtml(org)}</strong>'s week (${period}).`,
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${figures
      .map(
        ([label, value]) =>
          `<tr><td style="${cell}color:${MUTED};">${label}</td><td align="right" style="${cell}font-weight:bold;">${value}</td></tr>`,
      )
      .join("")}</table>`,
  ];
  if (digest.topCategories.length > 0) {
    paragraphs.push(
      `<strong>Where it went:</strong> ${digest.topCategories
        .map((c) => `${escapeHtml(c.name)} ${formatCurrency(c.amount, { currency: digest.currency })}`)
        .join(", ")}.`,
    );
  }
  if (attention.length > 0) {
    paragraphs.push(
      `<strong>Needs a look:</strong><br>${attention.map((a) => `• ${a.html}`).join("<br>")}`,
    );
  }

  return {
    to: to.email,
    headers: ending.headers,
    subject: oneLine(`${org}'s week: ${formatCurrency(net, { signed: true, currency: digest.currency })} net`),
    html: layout({
      preview: `Money in ${formatCurrency(digest.moneyIn, { currency: digest.currency })}, money out ${formatCurrency(digest.moneyOut, { currency: digest.currency })}.`,
      heading: "Your week in Finely",
      paragraphs,
      button: { label: "Open the dashboard", url: `${appUrl}/dashboard` },
      footnote: ending.footnote,
    }),
    text: `Hi ${firstName(to.name)}, here's ${org}'s week (${period}).

${figures.map(([label, value]) => `${label}: ${value}`).join("\n")}
${
  digest.topCategories.length > 0
    ? `\nWhere it went: ${digest.topCategories.map((c) => `${c.name} ${formatCurrency(c.amount, { currency: digest.currency })}`).join(", ")}.\n`
    : ""
}${attention.length > 0 ? `\nNeeds a look:\n${attention.map((a) => `- ${a.text}`).join("\n")}\n` : ""}
Open the dashboard: ${appUrl}/dashboard

${ending.text}`,
  };
}

// ---------------------------------------------------------------- contact form

/** A visitor's message from the Contact page, sent to us. Replies go to them. */
export function contactMessageEmail(to: string, m: ContactMessage): Email {
  const from = m.company ? `${m.name} (${m.company})` : m.name;
  return {
    to,
    replyTo: m.email,
    subject: oneLine(`Finely contact form: ${from}`),
    // Plain on purpose: it's for us, and everything in it was typed by a stranger
    html: `<!doctype html>
<html lang="en">
<body style="font-family:Arial,Helvetica,sans-serif;color:${TEXT};font-size:15px;line-height:1.6;">
<p><strong>${escapeHtml(from)}</strong> &lt;${escapeHtml(m.email)}&gt; wrote through the contact form:</p>
<p style="white-space:pre-wrap;border-left:3px solid ${BLUE};padding-left:12px;">${escapeHtml(m.message)}</p>
<p style="font-size:13px;color:${MUTED};">Reply to this email to answer them.</p>
</body>
</html>`,
    text: `${from} <${m.email}> wrote through the contact form:

${m.message}

Reply to this email to answer them.`,
  };
}
