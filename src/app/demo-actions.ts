// ─────────────────────────────────────────────────────────────────────────────
// What happens when "Try the demo" is pressed
//
// In plain words: makes a fresh demo company full of sample data, logs the
// visitor in as its owner and opens its dashboard (see lib/data/demo.ts).
//
// For developers: a server action ("use server"); anyone can call it with a
// POST request, so the checks (a limit per visitor) happen in lib/data/.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/data/common";
import { startDemo } from "@/lib/data/demo";

/** Starts a demo in the visitor's timezone, then opens its dashboard */
export async function startDemoAction(timeZone: string): Promise<ActionState> {
  try {
    await startDemo(timeZone);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/dashboard");
}
