// ─────────────────────────────────────────────────────────────────────────────
// Team settings (members and invitations)
//
// In plain words: the list of people in your company and their roles, the
// invitations that haven't been accepted yet, and — for owners and admins — a
// form to invite someone by email, a dropdown to make someone an admin or a
// member, plus buttons to remove people or cancel invitations. Members can
// see the team but not change it. Everyone except the owner can leave the
// company with the button next to their own name.
//
// For developers: a client component ("use client") for the forms and buttons.
// The page passes in the current data; after each change we call
// router.refresh() so the server sends the updated lists. Permissions are
// enforced by Better Auth on the server; canManageTeam() only hides buttons.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus } from "lucide-react";
import Button from "@/components/common/button/Button";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { authClient } from "@/lib/auth-client";
import { canManageTeam, roleLabel } from "@/lib/roles";
import { formatShortDate, getInitials } from "@/lib/format";
import Spinner from "@/components/common/spinner/Spinner";
import styles from "./TeamSettings.module.css";

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isYou: boolean;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
}

interface TeamSettingsProps {
  /** The company this team belongs to */
  organization: { id: string; name: string };
  /** Your own role, which decides what you may change */
  role: string;
  members: MemberRow[];
  invitations: InvitationRow[];
  /** Whether emails are really sent (Resend is set up) */
  emailEnabled: boolean;
}

export default function TeamSettings({
  organization,
  role,
  members,
  invitations,
  emailEnabled,
}: TeamSettingsProps) {
  const router = useRouter();
  const canManage = canManageTeam(role);
  // Feedback for the last action, and which action is in progress
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Runs one team action, shows its result, and reloads the lists on success
  const run = async (
    key: string,
    action: () => Promise<{ error: { message?: string } | null }>,
    success: string,
  ) => {
    setBusy(key);
    setMessage(null);
    const { error } = await action();
    setBusy(null);
    if (error) {
      setMessage({ type: "error", text: error.message ?? "Something went wrong. Please try again." });
      return false;
    }
    setMessage({ type: "success", text: success });
    router.refresh();
    return true;
  };

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email")).trim();
    const inviteRole = data.get("role") === "admin" ? "admin" : "member";
    const ok = await run(
      "invite",
      () => authClient.organization.inviteMember({ email, role: inviteRole }),
      `Invitation sent to ${email}.`,
    );
    if (ok) form.reset();
  };

  const handleRemove = (member: MemberRow) => {
    if (!window.confirm(`Remove ${member.name} from the team? They'll lose access right away.`)) return;
    run(
      `remove-${member.id}`,
      () => authClient.organization.removeMember({ memberIdOrEmail: member.id }),
      `${member.name} was removed from the team.`,
    );
  };

  const handleRoleChange = (member: MemberRow, newRole: string) => {
    const next = newRole === "admin" ? "admin" : "member";
    run(
      `role-${member.id}`,
      () => authClient.organization.updateMemberRole({ memberId: member.id, role: next }),
      `${member.name} is now ${next === "admin" ? "an admin" : "a member"}.`,
    );
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave ${organization.name}? You'll lose access right away.`)) return;
    setBusy("leave");
    setMessage(null);
    const { error } = await authClient.organization.leave({
      organizationId: organization.id,
    });
    if (error) {
      setBusy(null);
      setMessage({ type: "error", text: error.message ?? "Something went wrong. Please try again." });
      return;
    }
    // This login now has no company: /onboarding opens another one the
    // person belongs to, or offers to set one up
    router.push("/onboarding");
    router.refresh();
  };

  const handleCancel = (invitation: InvitationRow) => {
    run(
      `cancel-${invitation.id}`,
      () => authClient.organization.cancelInvitation({ invitationId: invitation.id }),
      `The invitation to ${invitation.email} was cancelled.`,
    );
  };

  return (
    <div className={styles.stack}>
      {message && (
        <Message type={message.type}>
          {message.text}
        </Message>
      )}

      {/* Invite form: owners and admins only */}
      {canManage ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Invite someone</h2>
            <p className={styles.cardHint}>
              They&apos;ll get a link to join. Admins can manage the team;
              members can use Finely but not change the team.
            </p>
          </div>
          <form className={styles.inviteForm} onSubmit={handleInvite}>
            <Input
              name="email"
              type="email"
              aria-label="Email address"
              placeholder="colleague@company.com"
              className={styles.email}
              autoComplete="off"
              required
            />
            <Select
              name="role"
              aria-label="Role"
              className={styles.role}
              defaultValue="member"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={busy === "invite"}
              text={busy === "invite" ? "Sending" : "Send invite"}
              icon={<UserPlus size={16} />}
              disabled={busy !== null}
            />
          </form>
          {!emailEnabled && (
            <p className={styles.devNote}>
              Email sending isn&apos;t set up (no RESEND_API_KEY), so invitation
              links are printed in the terminal running the server.
            </p>
          )}
        </section>
      ) : (
        <Message type="info">
          Only owners and admins can invite or remove people and change roles.
        </Message>
      )}

      {/* Everyone in the company */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Team members <span className={styles.count}>{members.length}</span>
          </h2>
        </div>
        <ul className={styles.list}>
          {members.map((member) => (
            <li key={member.id} className={styles.row}>
              <div className={styles.avatar} aria-hidden="true">
                {getInitials(member.name)}
              </div>
              <div className={styles.who}>
                <span className={styles.name}>
                  {member.name}
                  {member.isYou && <span className={styles.you}> (you)</span>}
                </span>
                <span className={styles.email}>{member.email}</span>
              </div>
              {/* Owners and admins can change the role of anyone but the
                  owner and themselves */}
              {canManage && !member.isYou && member.role !== "owner" ? (
                <Select
                  aria-label={`Role of ${member.name}`}
                  className={styles.rowRole}
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  disabled={busy !== null}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
              ) : (
                <span className={styles.badge}>{roleLabel(member.role)}</span>
              )}
              {/* A company always needs its owner, so the owner can't leave
                  (they can hand it over first, at the bottom of the page) */}
              {member.isYou && member.role !== "owner" && (
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={handleLeave}
                  disabled={busy !== null}
                >
                  {busy === "leave" ? (
                    <>
                      <Spinner size={12} /> Leaving
                    </>
                  ) : (
                    "Leave"
                  )}
                </button>
              )}
              {/* Owners can't be removed, and you can't remove yourself here */}
              {canManage && !member.isYou && member.role !== "owner" && (
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={() => handleRemove(member)}
                  disabled={busy !== null}
                >
                  {busy === `remove-${member.id}` ? (
                    <>
                      <Spinner size={12} /> Removing
                    </>
                  ) : (
                    "Remove"
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Invitations nobody has accepted yet */}
      {invitations.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              Pending invitations{" "}
              <span className={styles.count}>{invitations.length}</span>
            </h2>
          </div>
          <ul className={styles.list}>
            {invitations.map((invitation) => (
              <li key={invitation.id} className={styles.row}>
                <div className={`${styles.avatar} ${styles.avatarMuted}`} aria-hidden="true">
                  <Mail size={16} />
                </div>
                <div className={styles.who}>
                  <span className={styles.name}>{invitation.email}</span>
                  <span className={styles.email}>
                    Expires {formatShortDate(invitation.expiresAt)}
                  </span>
                </div>
                <span className={styles.badge}>{roleLabel(invitation.role)}</span>
                {canManage && (
                  <button
                    type="button"
                    className={styles.rowAction}
                    onClick={() => handleCancel(invitation)}
                    disabled={busy !== null}
                  >
                    {busy === `cancel-${invitation.id}` ? (
                      <>
                        <Spinner size={12} /> Cancelling
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
