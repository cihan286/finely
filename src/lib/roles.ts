// ─────────────────────────────────────────────────────────────────────────────
// Team roles and what each may do
//
// In plain words: everyone in a company has a role, and each role allows a
// set of things ("permissions"):
//
//   Owner       everything, and only the owner can hand the company over
//               to someone else, pay for a plan or delete the company
//   Admin       manages the team (invites people, changes their roles,
//               removes them) and the company's finances
//   Accountant  manages the finances (bank accounts, categories, rules,
//               cards, deleting transactions and bills, the activity log)
//               but not the team: for a bookkeeper or an outside advisor
//   Member      adds and edits transactions and bills, and attaches files
//   Viewer      sees everything, changes nothing
//
// For developers: ask can(role, "finance.manage") rather than comparing
// role names. The same roles are given to Better Auth (lib/auth.ts and
// lib/auth-client.ts), which enforces the team permissions on the server;
// the finance permissions are enforced by the data functions in lib/data/
// (getFinanceContext). Owner-only actions still check for "owner".
// ─────────────────────────────────────────────────────────────────────────────

import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

// Better Auth's own team statements, plus Finely's
const statements = {
  ...defaultStatements,
  // record: add and edit transactions and bills; manage: everything else
  finance: ["record", "manage"],
  activity: ["view"],
} as const;

export const ac = createAccessControl(statements);

const managesFinances = { finance: ["record", "manage"], activity: ["view"] } as const;

/** Every role, for Better Auth; the first ones are the most powerful */
export const roles = {
  owner: ac.newRole({ ...ownerAc.statements, ...managesFinances }),
  admin: ac.newRole({ ...adminAc.statements, ...managesFinances }),
  accountant: ac.newRole({ ...memberAc.statements, ...managesFinances }),
  member: ac.newRole({ ...memberAc.statements, finance: ["record"] }),
  viewer: ac.newRole({ ...memberAc.statements }),
};

export type Role = keyof typeof roles;

/** The roles in order, most powerful first (for lists and pickers) */
export const ROLES = Object.keys(roles) as Role[];

/** The roles someone can be invited with or given (one company has one owner) */
export const ASSIGNABLE_ROLES = ROLES.filter(
  (role): role is Exclude<Role, "owner"> => role !== "owner",
);

// What each permission means in Better Auth's terms
const PERMISSIONS = {
  /** Add and edit transactions and bills, attach files */
  "finance.record": { finance: ["record"] },
  /** Accounts, categories, rules, cards, settings, deleting */
  "finance.manage": { finance: ["manage"] },
  /** Read the activity log */
  "activity.view": { activity: ["view"] },
  /** Invite and remove people, change their roles */
  "team.manage": { invitation: ["create"], member: ["update", "delete"] },
} as const;

export type Permission = keyof typeof PERMISSIONS;

/** Whether a role (as stored, e.g. "admin") allows something */
export function can(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return roles[role].authorize(PERMISSIONS[permission]).success;
}

/** Whether a text is one of the roles */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && Object.hasOwn(roles, value);
}

/**
 * A role's name from the page's words (m.roles, or m.rolesInSentence inside
 * a sentence): "owner" -> "Owner", in Turkish "Sahip". Unknown roles are
 * shown as they are.
 */
export function roleLabel(role: string, labels: Record<Role, string>): string {
  return labels[role as Role] ?? role;
}
