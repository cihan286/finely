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
// enforced by Better Auth on the server; can(role, "team.manage") only hides
// buttons.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus } from "lucide-react";
import Button from "@/components/common/button/Button";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { useNotify } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { authClient } from "@/lib/auth-client";
import { ASSIGNABLE_ROLES, can, roleLabel, type Role } from "@/lib/roles";
import { formatShortDate, getInitials } from "@/lib/format";
import Spinner from "@/components/common/spinner/Spinner";
import { fill } from "@/i18n/config";
import { authErrorText } from "@/i18n/auth-errors";
import { useI18n } from "@/i18n/client";
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

// A role picked in a form; anything unexpected becomes a plain member
const assignable = (value: unknown): Exclude<Role, "owner"> =>
  ASSIGNABLE_ROLES.find((r) => r === value) ?? "member";

export default function TeamSettings({
  organization,
  role,
  members,
  invitations,
  emailEnabled,
}: TeamSettingsProps) {
  const router = useRouter();
  const i18n = useI18n();
  const { locale, m } = i18n;
  const t = m.settings.team;
  const canManage = can(role, "team.manage");
  const notify = useNotify();
  const confirm = useConfirm();
  // Which action is in progress
  const [busy, setBusy] = useState<string | null>(null);
  // Everyone can be invited as or given any role but owner
  const roleOptions = ASSIGNABLE_ROLES.map((r) => (
    <option key={r} value={r}>
      {m.roles[r]}
    </option>
  ));

  // Runs one team action, shows its result, and reloads the lists on success
  const run = async (
    key: string,
    action: () => Promise<{ error: { code?: string; message?: string; status?: number } | null }>,
    success: string,
  ) => {
    setBusy(key);
    const { error } = await action();
    setBusy(null);
    if (error) {
      notify({ type: "error", text: authErrorText(error, i18n, m.common.somethingWentWrong) });
      return false;
    }
    notify({ type: "success", text: success });
    router.refresh();
    return true;
  };

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email")).trim();
    const inviteRole = assignable(data.get("role"));
    const ok = await run(
      "invite",
      () => authClient.organization.inviteMember({ email, role: inviteRole }),
      fill(t.invited, { email }),
    );
    if (ok) form.reset();
  };

  const handleRemove = async (member: MemberRow) => {
    const text = fill(t.confirmRemove, { name: member.name });
    if (!(await confirm({ text, confirmText: t.remove, danger: true }))) return;
    run(
      `remove-${member.id}`,
      () => authClient.organization.removeMember({ memberIdOrEmail: member.id }),
      fill(t.removed, { name: member.name }),
    );
  };

  const handleRoleChange = (member: MemberRow, newRole: string) => {
    const next = assignable(newRole);
    run(
      `role-${member.id}`,
      () => authClient.organization.updateMemberRole({ memberId: member.id, role: next }),
      fill(t.nowRole, { name: member.name, role: m.auth.roleWithArticle[next] }),
    );
  };

  const handleLeave = async () => {
    const text = fill(t.confirmLeave, { company: organization.name });
    if (!(await confirm({ text, confirmText: t.leave, danger: true }))) return;
    setBusy("leave");
    const { error } = await authClient.organization.leave({
      organizationId: organization.id,
    });
    if (error) {
      setBusy(null);
      notify({ type: "error", text: authErrorText(error, i18n, m.common.somethingWentWrong) });
      return;
    }
    // Still shown on the next page: the window lives above every page
    notify({ type: "success", text: fill(t.left, { company: organization.name }) });
    // This login now has no company: /onboarding opens another one the
    // person belongs to, or offers to set one up
    router.push("/onboarding");
    router.refresh();
  };

  const handleCancel = (invitation: InvitationRow) => {
    run(
      `cancel-${invitation.id}`,
      () => authClient.organization.cancelInvitation({ invitationId: invitation.id }),
      fill(t.cancelled, { email: invitation.email }),
    );
  };

  return (
    <div className={styles.stack} id="team">
      {/* Invite form: owners and admins only */}
      {canManage ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t.invite}</h2>
            <p className={styles.cardHint}>{t.inviteHint}</p>
          </div>
          <form className={styles.inviteForm} onSubmit={handleInvite}>
            <Input
              name="email"
              type="email"
              aria-label={t.email}
              placeholder={t.emailPlaceholder}
              className={styles.email}
              autoComplete="off"
              required
            />
            <Select
              name="role"
              aria-label={t.role}
              className={styles.role}
              defaultValue="member"
            >
              {roleOptions}
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={busy === "invite"}
              text={busy === "invite" ? t.sending : t.send}
              icon={<UserPlus size={16} />}
              disabled={busy !== null}
            />
          </form>
          {!emailEnabled && (
            <p className={styles.devNote}>{t.devNote}</p>
          )}
        </section>
      ) : (
        <Message type="info">{t.onlyManagers}</Message>
      )}

      {/* Everyone in the company */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            {t.members} <span className={styles.count}>{members.length}</span>
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
                  {member.isYou && <span className={styles.you}> {t.you}</span>}
                </span>
                <span className={styles.email}>{member.email}</span>
              </div>
              {/* Owners and admins can change the role of anyone but the
                  owner and themselves */}
              {canManage && !member.isYou && member.role !== "owner" ? (
                <Select
                  aria-label={fill(t.roleOf, { name: member.name })}
                  className={styles.rowRole}
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  disabled={busy !== null}
                >
                  {roleOptions}
                </Select>
              ) : (
                <span className={styles.badge}>{roleLabel(member.role, m.roles)}</span>
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
                      <Spinner size={12} /> {t.leaving}
                    </>
                  ) : (
                    t.leave
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
                      <Spinner size={12} /> {t.removing}
                    </>
                  ) : (
                    t.remove
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
              {t.pending}{" "}
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
                    {fill(t.expires, { date: formatShortDate(invitation.expiresAt, locale) })}
                  </span>
                </div>
                <span className={styles.badge}>{roleLabel(invitation.role, m.roles)}</span>
                {canManage && (
                  <button
                    type="button"
                    className={styles.rowAction}
                    onClick={() => handleCancel(invitation)}
                    disabled={busy !== null}
                  >
                    {busy === `cancel-${invitation.id}` ? (
                      <>
                        <Spinner size={12} /> {t.cancelling}
                      </>
                    ) : (
                      t.cancel
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
