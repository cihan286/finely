// ─────────────────────────────────────────────────────────────────────────────
// Team roles
//
// In plain words: everyone in a company has a role. The owner (who created
// it, or was handed it) and admins can manage the team — invite people,
// change their roles and remove them — and the company's finances: bank
// accounts, categories, and deleting transactions. Members can add and edit
// transactions but can't change the team. Only the owner can hand the
// company over to someone else or delete it.
//
// For developers: the interface uses these to decide what to show. The team
// checks are enforced on the server by Better Auth, and the finance and
// owner-only checks by the data functions in lib/data/.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "member";

/**
 * A role's name from the page's words (m.roles, or m.rolesInSentence inside
 * a sentence): "owner" -> "Owner", in Turkish "Sahip". Unknown roles are
 * shown as they are.
 */
export function roleLabel(role: string, labels: Record<Role, string>): string {
  return labels[role as Role] ?? role;
}

/** Whether this role may invite and remove people */
export function canManageTeam(role: string): boolean {
  return role === "owner" || role === "admin";
}

/** Whether this role may manage accounts and categories and delete transactions */
export function canManageFinances(role: string): boolean {
  return role === "owner" || role === "admin";
}
