// ─────────────────────────────────────────────────────────────────────────────
// Email templates
//
// In plain words: the wording and look of every email Finely sends — password
// reset, "verify your email address", team invitations, the weekly summary,
// the alert for an unusually high charge, and the notes about a company
// being handed over or deleted, a failed payment and an account being
// deleted — plus the plain email we get ourselves when
// someone fills in the contact form. Each email has a designed version and
// a plain-text version, in its recipient's language (English or Turkish).
//
// For developers: emails can't use our CSS files, so styles are written inline,
// and buttons are built from tables so they also work in Outlook. The words
// are in i18n/messages/<language>/emails.ts. Anything a user typed (names,
// company names) MUST go through escapeHtml() — html() below does it for
// every value it fills in: otherwise someone could name their company with
// HTML and turn our invitation emails into convincing phishing.
// ─────────────────────────────────────────────────────────────────────────────

import { appUrl } from "@/lib/app-url";
import type { ContactMessage } from "@/lib/contact";
import type { Digest } from "@/lib/finance/digest";
import type { UnusualCharge } from "@/lib/finance/insights";
import { formatCurrency, formatDate } from "@/lib/format";
import { DEFAULT_LOCALE, fill, isLocale, plural, type Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";
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

type Values = Record<string, string | number>;

// A recipient's saved language, or English
const localeOf = (value: string | null | undefined): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;

/** A sentence for the HTML version: values escaped, <b>…</b> made bold */
function html(sentence: string, values: Values = {}): string {
  const safe: Values = {};
  for (const [name, value] of Object.entries(values)) {
    safe[name] = typeof value === "string" ? escapeHtml(value) : value;
  }
  return fill(escapeHtml(sentence).replace(/&lt;(\/?)b&gt;/g, "<$1strong>"), safe);
}

/** A sentence for the plain-text version: values as they are, no bold */
function text(sentence: string, values: Values = {}): string {
  return fill(sentence.replace(/<\/?b>/g, ""), values);
}

/** An email's words, and its money and date formats, in a language */
function wordsFor(locale: Locale) {
  const m = messagesFor(locale).emails;
  return {
    m,
    locale,
    money: (amount: number, currency: string, signed = false) =>
      formatCurrency(amount, { signed, currency }, locale),
    date: (day: string) => formatDate(day, locale),
  };
}

interface LayoutParts {
  locale: Locale;
  /** Short summary some email apps show next to the subject */
  preview: string;
  heading: string;
  /** Paragraphs of HTML (already escaped) */
  paragraphs: string[];
  button: { label: string; url: string };
  /** Small print under the button (HTML, already escaped) */
  footnote: string;
}

// The shared frame of every email: logo, heading, text, button, small print
function layout({ locale, preview, heading, paragraphs, button, footnote }: LayoutParts): string {
  const { m } = wordsFor(locale);
  const url = escapeHtml(button.url);
  return `<!doctype html>
<html lang="${locale}">
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
<tr><td style="font-size:13px;line-height:1.6;color:${MUTED};">${footnote}<br><br>${escapeHtml(m.copyLink)}<br><a href="${url}" style="color:${BLUE};word-break:break-all;">${url}</a></td></tr>
</table>
<p style="font-size:12px;color:${MUTED};margin-top:16px;">${escapeHtml(m.tagline)}</p>
</td></tr>
</table>
</body>
</html>`;
}

/** Removes line breaks and other control characters (for subject lines) */
const oneLine = (value: string) => value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

/** "Maya Carter" -> "Maya" (for greetings) */
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

// "Hi Maya," as HTML and as text
function greeting(name: string, m: ReturnType<typeof wordsFor>["m"]) {
  const first = firstName(name);
  return first
    ? { html: html(m.hi, { name: first }), text: text(m.hi, { name: first }) }
    : { html: escapeHtml(m.hiNoName), text: m.hiNoName };
}

// ---------------------------------------------------------------- password reset

export function passwordResetEmail(
  to: string,
  name: string,
  url: string,
  locale: Locale = DEFAULT_LOCALE,
): Email {
  const { m } = wordsFor(locale);
  const t = m.passwordReset;
  const hi = greeting(name, m);
  return {
    to,
    subject: t.subject,
    html: layout({
      locale,
      preview: t.preview,
      heading: t.heading,
      paragraphs: [hi.html, html(t.body)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${t.textBody}

${url}

${t.textFootnote}`,
  };
}

// ---------------------------------------------------------------- email verification

export function verifyEmailEmail(
  to: string,
  name: string,
  url: string,
  locale: Locale = DEFAULT_LOCALE,
): Email {
  const { m } = wordsFor(locale);
  const t = m.verify;
  const hi = greeting(name, m);
  return {
    to,
    subject: t.subject,
    html: layout({
      locale,
      preview: t.preview,
      heading: t.heading,
      paragraphs: [hi.html, html(t.body)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${t.textBody}

${url}

${t.footnote}`,
  };
}

// ---------------------------------------------------------------- team invitation

interface InvitationDetails {
  to: string;
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  /** "owner", "admin" or "member" */
  role: string;
  url: string;
}

export function invitationEmail(d: InvitationDetails, locale: Locale = DEFAULT_LOCALE): Email {
  const { m } = wordsFor(locale);
  const t = m.invitation;
  const roles: Record<string, string> = messagesFor(locale).auth.roleWithArticle;
  const values = {
    inviter: d.inviterName,
    email: d.inviterEmail,
    company: d.organizationName,
    role: roles[d.role] ?? d.role,
  };
  return {
    to: d.to,
    subject: oneLine(text(t.subject, values)),
    html: layout({
      locale,
      preview: text(t.preview, values),
      heading: text(t.heading, values),
      paragraphs: [html(t.body, values), html(t.about)],
      button: { label: t.button, url: d.url },
      footnote: html(t.footnote),
    }),
    text: `${text(t.body, values)}

${t.textAccept}

${d.url}

${t.footnote}`,
  };
}

// ---------------------------------------------------------------- handover and deletion

/** Sent to the person a company was just handed over to */
export function ownershipTransferredEmail(
  to: { name: string; email: string; locale?: string | null },
  organizationName: string,
  formerOwnerName: string,
): Email {
  const locale = localeOf(to.locale);
  const { m } = wordsFor(locale);
  const t = m.ownership;
  const url = `${appUrl}/dashboard/settings`;
  const values = { company: organizationName, owner: formerOwnerName };
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    subject: oneLine(text(t.subject, values)),
    html: layout({
      locale,
      preview: text(t.preview, values),
      heading: text(t.heading, values),
      paragraphs: [hi.html, html(t.body, values), html(t.owner)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${text(t.body, values)}

${t.owner}

${url}

${t.footnote}`,
  };
}

/** Sent to everyone else on the team when the owner deleted the company */
export function companyDeletedEmail(
  to: { name: string; email: string; locale?: string | null },
  organizationName: string,
  ownerName: string,
): Email {
  const locale = localeOf(to.locale);
  const { m } = wordsFor(locale);
  const t = m.companyDeleted;
  const url = `${appUrl}/dashboard`;
  const values = { company: organizationName, owner: ownerName };
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    subject: oneLine(text(t.subject, values)),
    html: layout({
      locale,
      preview: text(t.preview, values),
      heading: text(t.heading, values),
      paragraphs: [hi.html, html(t.body, values), html(t.untouched)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${text(t.body, values)}

${t.untouched}

${url}`,
  };
}

/** Sent to a company's owner when the payment for its plan failed */
export function paymentFailedEmail(
  to: { name: string; email: string; locale?: string | null },
  organizationName: string,
): Email {
  const locale = localeOf(to.locale);
  const { m } = wordsFor(locale);
  const t = m.paymentFailed;
  const url = `${appUrl}/dashboard/settings#billing`;
  const values = { company: organizationName };
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    subject: oneLine(text(t.subject, values)),
    html: layout({
      locale,
      preview: t.preview,
      heading: t.heading,
      paragraphs: [hi.html, html(t.body, values), html(t.nothingChanges)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${text(t.body, values)}

${t.nothingChanges}

${t.textUpdate} ${url}

${t.owner}`,
  };
}

/** Sent to a company's owner when its paid plan has ended */
export function planEndedEmail(
  to: { name: string; email: string; locale?: string | null },
  organizationName: string,
  /** The plan that ended, e.g. "Growth" */
  planName: string,
  /** How many people the Free plan allows */
  freeMembers: number,
): Email {
  const locale = localeOf(to.locale);
  const { m } = wordsFor(locale);
  const t = m.planEnded;
  const url = `${appUrl}/dashboard/settings#billing`;
  const values = { company: organizationName, plan: planName, members: freeMembers };
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    subject: oneLine(text(t.subject, values)),
    html: layout({
      locale,
      preview: text(t.preview, values),
      heading: text(t.heading, values),
      paragraphs: [hi.html, html(t.body, values), html(t.nothingDeleted, values)],
      button: { label: t.button, url },
      footnote: html(t.owner),
    }),
    text: `${hi.text}

${text(t.body, values)}

${text(t.nothingDeleted, values)}

${t.button}: ${url}

${t.owner}`,
  };
}

/** Sent to someone who just deleted their own account */
export function accountDeletedEmail(to: {
  name: string;
  email: string;
  locale?: string | null;
}): Email {
  const locale = localeOf(to.locale);
  const { m } = wordsFor(locale);
  const t = m.accountDeleted;
  const url = `${appUrl}/contact`;
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    subject: t.subject,
    html: layout({
      locale,
      preview: t.preview,
      heading: t.heading,
      paragraphs: [hi.html, html(t.body), html(t.stays)],
      button: { label: t.button, url },
      footnote: html(t.footnote),
    }),
    text: `${hi.text}

${t.body}

${t.stays}

${t.footnote} ${url}`,
  };
}

// ---------------------------------------------------------------- unusual charge

// Where people choose which emails they get
const SETTINGS_URL = `${appUrl}/dashboard/settings#emails`;

interface Recipient {
  name: string;
  email: string;
  /** Their language; English when unknown */
  locale?: string | null;
}

/** The addresses that stop this kind of email (see lib/email/unsubscribe.ts) */
interface UnsubscribeLinks {
  pageUrl: string;
  postUrl: string;
}

// How an email that can be stopped ends: the small print as HTML and as
// text, and the headers that give email apps their own "Unsubscribe" button
function stoppable(why: string, links: UnsubscribeLinks | null | undefined, locale: Locale) {
  const t = wordsFor(locale).m.stoppable;
  if (!links) {
    const footnote = `${why} ${t.settings}`;
    return {
      footnote: escapeHtml(footnote),
      text: `${footnote}\n${SETTINGS_URL}`,
      headers: undefined,
    };
  }
  return {
    footnote: `${escapeHtml(why)} <a href="${escapeHtml(links.pageUrl)}" style="color:${MUTED};">${escapeHtml(t.unsubscribe)}</a>, ${escapeHtml(t.orChoose)}`,
    text: `${why}\n${t.textUnsubscribe} ${links.pageUrl}\n${t.textChoose} ${SETTINGS_URL}`,
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
  const locale = localeOf(to.locale);
  const { m, money, date } = wordsFor(locale);
  const t = m.unusual;
  const one = charges.length === 1;
  const values = (c: UnusualCharge) => ({
    name: c.name,
    amount: money(c.amount, currency),
    day: date(c.day),
    percent: c.percentAbove,
    usual: money(c.usual, currency),
  });
  const heading = one
    ? text(t.headingOne, { name: charges[0].name })
    : text(t.headingMany, { count: charges.length });
  const company = { company: organizationName };
  const ending = stoppable(text(t.why, company), unsubscribe, locale);
  const hi = greeting(to.name, m);
  return {
    to: to.email,
    headers: ending.headers,
    subject: oneLine(text(t.subject, { heading, company: organizationName })),
    html: layout({
      locale,
      preview: text(t.line, values(charges[0])),
      heading,
      paragraphs: [
        hi.html,
        html(one ? t.introOne : t.introMany, company),
        ...charges.map((c) => html(t.lineHtml, values(c))),
      ],
      button: {
        label: one ? t.buttonOne : t.buttonMany,
        url: one
          ? `${appUrl}/dashboard/transactions?edit=${charges[0].id}`
          : `${appUrl}/dashboard/insights`,
      },
      footnote: ending.footnote,
    }),
    text: `${hi.text}

${text(one ? t.textIntroOne : t.textIntroMany, company)}

${charges.map((c) => `- ${text(t.line, values(c))}`).join("\n")}

${t.textReview} ${appUrl}/dashboard/insights

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
  const locale = localeOf(to.locale);
  const { m, money, date } = wordsFor(locale);
  const t = m.digest;
  const org = digest.organizationName;
  const currency = digest.currency;
  const net = digest.moneyIn - digest.moneyOut;
  const bills = (count: number) => plural(count, t.bills);

  const figures: [string, string][] = [
    [t.moneyIn, money(digest.moneyIn, currency)],
    [t.moneyOut, money(digest.moneyOut, currency)],
    [t.net, money(net, currency, true)],
    [t.inBank, money(digest.balance, currency)],
  ];
  // Plain sentences; names typed by people are escaped for the HTML version
  const attention: { text: string; html: string }[] = [];
  const note = (sentence: string, values: Values) =>
    attention.push({ text: text(sentence, values), html: html(sentence, values) });
  if (digest.overdueBills.count > 0) {
    note(t.overdue, {
      bills: bills(digest.overdueBills.count),
      amount: money(digest.overdueBills.amount, currency),
    });
  }
  if (digest.billsDueSoon.count > 0) {
    note(t.dueSoon, {
      bills: bills(digest.billsDueSoon.count),
      amount: money(digest.billsDueSoon.amount, currency),
    });
  }
  for (const b of digest.overBudget) {
    note(t.overBudget, {
      name: b.name,
      over: money(b.spent - b.budget, currency),
      budget: money(b.budget, currency),
    });
  }
  for (const c of digest.unusualCharges) {
    note(t.unusual, {
      name: c.name,
      amount: money(c.amount, currency),
      percent: c.percentAbove,
      usual: money(c.usual, currency),
    });
  }

  const period = `${date(digest.from)} – ${date(digest.to)}`;
  const ending = stoppable(text(t.why, { company: org }), unsubscribe, locale);
  const cell = "padding:4px 0;font-size:15px;";
  const intro = { name: firstName(to.name), company: org, period };
  const where = digest.topCategories.map((c) => ({
    name: c.name ?? messagesFor(locale).transactions.uncategorized,
    amount: money(c.amount, currency),
  }));

  const paragraphs = [
    html(t.intro, intro),
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${figures
      .map(
        ([label, value]) =>
          `<tr><td style="${cell}color:${MUTED};">${escapeHtml(label)}</td><td align="right" style="${cell}font-weight:bold;">${escapeHtml(value)}</td></tr>`,
      )
      .join("")}</table>`,
  ];
  if (where.length > 0) {
    paragraphs.push(
      `<strong>${escapeHtml(t.whereItWent)}</strong> ${where
        .map((c) => `${escapeHtml(c.name)} ${escapeHtml(c.amount)}`)
        .join(", ")}.`,
    );
  }
  if (attention.length > 0) {
    paragraphs.push(
      `<strong>${escapeHtml(t.needsALook)}</strong><br>${attention.map((a) => `• ${a.html}`).join("<br>")}`,
    );
  }

  return {
    to: to.email,
    headers: ending.headers,
    subject: oneLine(text(t.subject, { company: org, net: money(net, currency, true) })),
    html: layout({
      locale,
      preview: text(t.preview, {
        in: money(digest.moneyIn, currency),
        out: money(digest.moneyOut, currency),
      }),
      heading: t.heading,
      paragraphs,
      button: { label: t.button, url: `${appUrl}/dashboard` },
      footnote: ending.footnote,
    }),
    text: `${text(t.intro, intro)}

${figures.map(([label, value]) => `${label}: ${value}`).join("\n")}
${
  where.length > 0
    ? `\n${t.whereItWent} ${where.map((c) => `${c.name} ${c.amount}`).join(", ")}.\n`
    : ""
}${attention.length > 0 ? `\n${t.needsALook}\n${attention.map((a) => `- ${a.text}`).join("\n")}\n` : ""}
${t.button}: ${appUrl}/dashboard

${ending.text}`,
  };
}

// ---------------------------------------------------------------- contact form

/** A visitor's message from the Contact page, sent to us (in English). Replies go to them. */
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
