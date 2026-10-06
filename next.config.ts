// ─────────────────────────────────────────────────────────────────────────────
// Next.js settings
//
// In plain words: Next.js is the framework Finely is built with — it turns our
// code into the website. This file holds its project-wide settings.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The React Compiler automatically optimizes components so pages re-draw
  // only what actually changed. It makes the app faster without extra code.
  reactCompiler: true,
};

export default nextConfig;
