// ─────────────────────────────────────────────────────────────────────────────
// Team roles
//
// In plain words: everyone in a company has a role. The owner (who created it)
// and admins can manage the team — invite people and remove them. Members can
// use Finely but can't change the team.
//
// For developers: these only decide what the interface shows. The real
// permission checks happen on the server, inside Better Auth.
// ─────────────────────────────────────────────────────────────────────────────

export type Role = "owner" | "admin" | "member";

// Names shown on screen for each role
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/** "owner" -> "Owner"; unknown roles are shown as they are */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

/** Whether this role may invite and remove people */
export function canManageTeam(role: string): boolean {
  return role === "owner" || role === "admin";
}
