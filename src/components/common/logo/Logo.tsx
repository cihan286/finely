// ─────────────────────────────────────────────────────────────────────────────
// Finely logo
//
// In plain words: the Finely logo — three rising blue bars next to the word
// "Finely". It's drawn in code (SVG) so it stays sharp at any size. The word
// can be hidden, e.g. when the dashboard menu is collapsed.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./Logo.module.css";

export default function Logo({ showText = true }: { showText?: boolean }) {
  return (
    <svg
      className={styles.logoSvg}
      width="150"
      height="36"
      viewBox="0 0 150 36"
      preserveAspectRatio="xMinYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Finely"
    >
      {/* The three bars, from shortest and lightest to tallest and darkest */}
      <rect x="2" y="24" width="6" height="10" rx="3" fill="#BBDEFB" />
      <rect x="12" y="18" width="6" height="16" rx="3" fill="#64B5F6" />
      <rect x="22" y="10" width="6" height="24" rx="3" fill="#2196F3" />

      {/* The word "Finely", fading in and out with showText */}
      <text
        x="35"
        y="31"
        style={{
          fontFamily: "var(--lexend), Helvetica, Arial, sans-serif",
          opacity: showText ? 1 : 0,
          transition: "opacity 0.2s ease",
          pointerEvents: showText ? "auto" : "none",
        }}
        fontSize="24"
        letterSpacing="0.3"
        fill="currentColor"
      >
        Finely
      </text>
    </svg>
  );
}
