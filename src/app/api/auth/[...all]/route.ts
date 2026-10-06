import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Handles every /api/auth/* request: sign-in, sign-up, sign-out, OAuth callbacks…
export const { GET, POST } = toNextJsHandler(auth);
