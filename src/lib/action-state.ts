// ─────────────────────────────────────────────────────────────────────────────
// The result of submitting a form
//
// In plain words: after you press Save, the server answers with either an
// error to show ("Amount must be a number.") or a short success message.
//
// For developers: the state type for useActionState with the server actions
// in app/dashboard/*/actions.ts. Safe to import from client components.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionState {
  /** Shown to the person when the action failed */
  error: string | null;
  /** Shown to the person when the action worked */
  success?: string;
}

export const initialActionState: ActionState = { error: null };
