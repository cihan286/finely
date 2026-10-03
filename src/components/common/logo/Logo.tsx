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
      <rect x="2" y="24" width="6" height="10" rx="3" fill="#BBDEFB" />
      <rect x="12" y="18" width="6" height="16" rx="3" fill="#64B5F6" />
      <rect x="22" y="10" width="6" height="24" rx="3" fill="#2196F3" />

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
