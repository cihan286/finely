// The public pages: About, Contact, Terms, Privacy and the error pages.
// <b>…</b>, <privacy>…</privacy> and the like are filled in by rich()
// (i18n/rich.tsx).

/** A section of a long page: a heading, then paragraphs and/or a list */
export interface PageSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  /** Paragraphs after the list */
  after?: string[];
}

export const site = {
  about: {
    metaDescription:
      "Finely gives a business one clear view of its money: what came in, what went out, and where it's heading.",
    label: "About",
    title: "One clear view of your company's money",
    intro:
      "Finely is for businesses that want to know where they stand without living in spreadsheets. Bring in your bank statements, and Finely shows what came in, what went out, and what deserves a second look.",
    doesHeading: "What Finely does",
    does: [
      "<b>Keeps every payment in one place.</b> Link your bank so transactions arrive by themselves, add them by hand, or import your bank's CSV export. Importing the same statement twice is harmless: lines you already have are skipped.",
      "<b>Sorts spending for you.</b> Tell Finely once that “AWS” is Software & IT, and it categorizes those payments from then on.",
      "<b>Shows where the money goes.</b> Cash flow, spending by category and by vendor, and how much of your income you kept, over the last 3, 6 or 12 months.",
      "<b>Points out what's unusual.</b> A charge well above what that vendor normally bills, an account below zero, a payment that has been pending for too long.",
    ],
    teamsHeading: "Built for teams",
    teams:
      "Everyone works inside their company. Owners and admins invite teammates, decide who can manage accounts and categories, and can remove access at any time. If you work with several businesses, you can switch between them without logging out.",
    dataHeading: "How we treat your data",
    data: "A company's data is only ever shown to the people in that company. Finely never sees your bank login: you import statements yourself, or link your bank through Plaid and log in there. Amounts are stored to the exact cent, and dates follow your company's own timezone, so the numbers match your bank's.",
    contactUs: "Contact us",
  },
  contact: {
    metaDescription:
      "Questions about Finely, the Enterprise plan or your account? Send us a message.",
    label: "Contact",
    title: "Talk to us",
    intro:
      "Curious about the Enterprise plan, stuck on something, or have an idea for Finely? Send us a message and we'll reply by email.",
    sent: "Thanks! Your message is on its way. We'll reply by email.",
    tooMany: "You've sent several messages in a short time. Please try again in an hour.",
    notSent: "We couldn't send your message. Please try again later.",
    nameMissing: "Please tell us your name.",
    emailInvalid: "Please enter a valid email address, so we can reply.",
    messageMissing: "Please write a message.",
    tooLong: "{field} can be at most {max} characters.",
    fieldName: "Your name",
    fieldEmail: "Your email address",
    fieldCompany: "The company name",
    fieldMessage: "Your message",
  },
  legal: {
    label: "Legal",
    updated: "Last updated: {date}",
  },
  terms: {
    title: "Terms of service",
    metaDescription: "The agreement between Finely and the people and companies using it.",
    intro:
      "These terms are the agreement between you and Finely, Inc. when you use the Finely website and app. By creating an account you accept them.",
    sections: [
      {
        heading: "1. What Finely is",
        paragraphs: [
          "Finely helps businesses keep track of their money: transactions, bills, budgets and what they add up to. It shows you your own records in a clearer way. It is not a bank, it doesn't move money, and it doesn't give accounting, tax, legal or investment advice. Forecasts and other estimates are just that: estimates.",
        ],
      },
      {
        heading: "2. Your account",
        list: [
          "Give us a real name and an email address you can read.",
          "Keep your password to yourself. You're responsible for what happens under your account; tell us right away if someone else got in.",
          "You must be old enough to enter into a contract, and allowed to act for the company you set up or join.",
        ],
      },
      {
        heading: "3. Companies and teams",
        paragraphs: [
          "Everyone works inside a company. The person who sets a company up is its owner. Owners and admins decide who is invited, what role each person has and who is removed. The owner can hand the company over to another member, or delete it with all its data. The company is responsible for what its team does in Finely.",
        ],
      },
      {
        heading: "4. Your data",
        paragraphs: [
          "The data you and your team put into Finely stays yours. You give us permission to store and process it only to provide Finely to you. You're responsible for having the right to put it there, and for its accuracy. How we handle personal data is described in our <privacy>Privacy policy</privacy>.",
        ],
      },
      {
        heading: "5. What you may not do",
        list: [
          "Use Finely for anything unlawful, or to deceive anyone.",
          "Try to reach another company's data, or get around Finely's security.",
          "Overload or disrupt Finely, or use automated tools against it without our agreement.",
          "Copy, resell or reverse-engineer Finely.",
        ],
        after: ["We may suspend an account that does any of this."],
      },
      {
        heading: "6. Plans and payment",
        paragraphs: [
          "Finely has a free plan and paid plans, which differ in how many people can be on a company's team. A paid plan is a subscription that the company's owner starts and pays for through Stripe; it renews each month or year until it's cancelled, which the owner can do at any time under Settings. A cancelled plan stays active until the end of the period already paid for. The price is shown before you commit to it, and nothing is charged without your agreement. If we change prices, we'll tell you in advance, and you can stop before the new price applies. Deleting a company ends its subscription.",
        ],
      },
      {
        heading: "7. Availability and changes",
        paragraphs: [
          "We work to keep Finely running and your data safe, but we don't promise that it will always be available or free of errors. We may add, change or remove features. Keep your own copies of records you can't afford to lose; you can export your transactions at any time.",
        ],
      },
      {
        heading: "8. Ending",
        paragraphs: [
          "You can stop using Finely whenever you like. A company's owner can delete the company and its data in Settings, and you can ask us to delete your account. We may end or suspend your access if you break these terms, or if we stop offering Finely; where we reasonably can, we'll warn you first so you can export your data.",
        ],
      },
      {
        heading: "9. Our responsibility",
        paragraphs: [
          "Finely is provided as it is. As far as the law allows, we aren't liable for indirect losses, such as lost profit, lost business or decisions made on the basis of figures shown in Finely. Nothing in these terms limits liability that can't be limited by law.",
        ],
      },
      {
        heading: "10. Changes to these terms",
        paragraphs: [
          "If we change these terms, we'll update this page and its date, and tell you by email or in the app before a change that matters takes effect. Using Finely after that means you accept the new terms.",
        ],
      },
      {
        heading: "11. Contact",
        paragraphs: ["Questions about these terms? <contact>Send us a message</contact>."],
      },
    ] as PageSection[],
  },
  privacy: {
    title: "Privacy policy",
    metaDescription: "What Finely collects, why, who else handles it, and the choices you have.",
    intro:
      "Finely holds your company's financial records, so here is plainly what we collect, what we do with it, and what we don't.",
    sections: [
      {
        heading: "Who this is about",
        paragraphs: [
          "“Finely”, “we” and “us” mean Finely, Inc., which runs this website and the Finely app. This policy covers both. When a company uses Finely, that company decides what financial data goes in and who on its team can see it; we handle that data on the company's behalf.",
        ],
      },
      {
        heading: "What we collect",
        list: [
          "<b>Your account.</b> Your name, your email address, your password and the language you use Finely in. The password is stored only in scrambled (hashed) form, so nobody, including us, can read it. If you sign in with Google, we receive your name, email address and profile picture from Google instead of a password.",
          "<b>Your company's data.</b> What you and your team enter or import: the company's name and timezone, bank account names with their last four digits and balances, transactions, the receipts and invoices attached to them, bills, categories, budgets and rules, the company's payment cards (a name, the last four digits and who carries each; never the full number), and who is on the team with which role.",
          "<b>Your bank's data, if you link a bank.</b> When an owner or admin links the company's bank, we receive that bank's account names, the last digits of the account numbers, balances and transactions, and keep them up to date. You log in at your bank in a window from Plaid; we never see or store your bank login, and we can't move money. We do store a key that lets us read that data, encrypted, until the bank is disconnected.",
          "<b>A record of changes.</b> Who added, changed or deleted what in a company, and when, so its owners and admins can look it up.",
          "<b>Your logins.</b> For each login we keep when it started, the IP address and the browser it came from. In production we also count sign-in attempts per IP address for a short time, to stop people guessing passwords.",
          "<b>Messages you send us.</b> What you write in the contact form, with your name and email address. To stop abuse of the form, we count for an hour how many messages came from an IP address.",
          "<b>Trying the demo.</b> “Try the demo” makes a pretend company with a pretend login, without asking for anything about you. Like any login, it keeps the IP address and browser it came from, and we count for an hour how many demos came from an IP address.",
        ],
      },
      {
        heading: "What we use it for",
        list: [
          "To show you and your team your company's finances.",
          "To send the emails the app needs: verifying your address, resetting your password, and team invitations.",
          "To email you about your company's money, if you want it: a weekly summary, and an alert when a charge is unusually high. These only go to verified addresses, and you can switch each off in Settings.",
          "To keep accounts secure and to find and fix errors.",
          "To answer you when you write to us.",
        ],
        after: [
          "We don't sell your data, we don't use it for advertising, and we don't look at your company's finances except when you ask us for help or when the law requires it.",
        ],
      },
      {
        heading: "Who else handles it",
        paragraphs: [
          "We use a few companies to run Finely. They only get what they need for their part:",
        ],
        list: [
          "<b>Vercel</b> hosts the website and the app.",
          "<b>Neon</b> hosts the database where accounts and company data are stored.",
          "<b>Resend</b> delivers our emails, so it sees the recipient's address and the email's content (for the weekly summary and alerts, that includes the figures in them).",
          "<b>Sentry</b> receives reports when something breaks. We set it up to send no personal or financial data: no cookies, no form contents, no database values.",
          "<b>Stripe</b>, only if your company pays for a plan. Stripe takes the payment on its own pages: we never see card numbers. We keep which plan the company is on and Stripe's IDs for the customer and the subscription.",
          "<b>Plaid</b>, only if you link a bank. Plaid connects to your bank with the login you give it and passes us the accounts and transactions. Its own privacy policy applies to what it collects.",
          "<b>Google</b>, only if you choose “Continue with Google” to sign in.",
        ],
        after: [
          "Within your company, your teammates can see the company's data and each other's names, email addresses and roles.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Finely only uses the cookies needed to keep you logged in and to remember the language you picked. There are no advertising cookies and no analytics that follow you around the web.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep your account and your company's data for as long as they exist in Finely. A company's owner can delete the company in Settings, which removes its accounts, transactions, attached files, bills, categories, rules, bank links and record of changes right away. Disconnecting a bank ends our access to it; what was already imported stays until you delete it. Logins expire by themselves. A demo company is deleted, with its pretend login and anything typed into it, a day after it was started. Copies in backups disappear as those backups are replaced.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "In Settings, under “Your data”, you can download a copy of what we hold about you, and delete your account yourself. Deleting it removes your profile, your logins and your place in every company right away; what you entered for a company stays with that company, and its record of changes keeps your name next to what you did. If you own a company, hand it over or delete it first. Depending on where you live, the law may give you further rights, such as having your data corrected, objecting to how we use it or complaining to your data protection authority. For those, or if you can't log in, <contact>write to us</contact>. If the data belongs to a company you work for, we may point you to that company's owner.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Connections to Finely are encrypted, passwords are stored hashed, and every request for company data checks that you belong to that company. No system is perfectly safe, so please use a strong password and tell us right away if you think someone else got into your account.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "If we change this policy, we'll update this page and its date. If a change matters for how your data is used, we'll tell you by email or in the app first.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Questions about this policy or your data? <contact>Send us a message</contact>. See also our <terms>Terms of service</terms>.",
        ],
      },
    ] as PageSection[],
  },
  notFound: {
    title: "Page not found",
    label: "Error 404",
    heading: "This page doesn't exist",
    intro: "The link may be old or mistyped, or the page may have moved.",
    openDashboard: "Open your dashboard",
    goHome: "Go to the home page",
  },
  error: {
    title: "Something went wrong",
    text: "We've been notified and are looking into it. Please try again in a moment.",
    tryAgain: "Try again",
    reference: "Reference: {digest}",
  },
  unsubscribe: {
    title: "Unsubscribe",
    label: "Email notifications",
    broken: "This link doesn't work",
    done: "You're unsubscribed",
    brokenText:
      "The link is incomplete or was changed. Open the link in the email again, or choose your emails under <settings>Settings → Email notifications</settings>.",
    stopped: {
      weeklyDigest:
        "You won't get the weekly summary for this company any more. Changed your mind? Switch it back on under <settings>Settings → Email notifications</settings>.",
      unusualCharges:
        "You won't get alerts about unusually high charges for this company any more. Changed your mind? Switch them back on under <settings>Settings → Email notifications</settings>.",
    },
    question: {
      weeklyDigest:
        "Stop the weekly summary for this company? Your other emails from Finely stay as they are.",
      unusualCharges:
        "Stop alerts about unusually high charges for this company? Your other emails from Finely stay as they are.",
    },
  },
  yourAccount: {
    title: "Your account",
    signedInAs: "Signed in as {email}.",
    backToFinely: "Back to Finely",
  },
};
