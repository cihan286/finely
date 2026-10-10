// ─────────────────────────────────────────────────────────────────────────────
// Submitting forms: reading what was sent, and the answer
//
// In plain words: after you press Save, the server reads what you typed and
// answers with either an error to show ("Amount must be a number.") or a
// short success message.
//
// For developers: shared by the server actions in app/dashboard/*/actions.ts.
// ActionState is the state type for useActionState. Safe to import from
// client components.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionState {
  /** Shown to the person when the action failed */
  error: string | null;
  /** Shown to the person when the action worked */
  success?: string;
}

export const initialActionState: ActionState = { error: null };

/** One text field of a submitted form; "" when it's missing or a file */
export function formField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
