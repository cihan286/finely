import { createAuthClient } from "better-auth/react";

// Browser-side auth API (sign in, sign up, sign out). Same origin as the app.
export const authClient = createAuthClient();
