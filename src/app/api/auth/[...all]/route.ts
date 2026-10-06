// ─────────────────────────────────────────────────────────────────────────────
// Authentication API endpoint
//
// In plain words: when someone clicks "Log in" or "Create account", their
// browser sends the details to an address starting with /api/auth/. This file
// receives all of those requests and hands them to our auth setup in
// lib/auth.ts.
//
// For developers: the [...all] folder name is a catch-all route, so this one
// file serves /api/auth/sign-in/email, /api/auth/callback/google, and so on.
// ─────────────────────────────────────────────────────────────────────────────

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Handles every /api/auth/* request: sign-in, sign-up, sign-out, OAuth callbacks…
export const { GET, POST } = toNextJsHandler(auth);
