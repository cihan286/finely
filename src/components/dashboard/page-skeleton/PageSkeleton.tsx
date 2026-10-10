// ─────────────────────────────────────────────────────────────────────────────
// Loading placeholder for dashboard pages
//
// In plain words: the grey, softly pulsing outline of a page (a title, a row
// of tiles, two cards) shown the moment someone clicks a menu entry, until
// the real page with its data is ready. It tells people "this is loading"
// instead of leaving the old page on screen.
//
// For developers: rendered by app/dashboard/loading.tsx. Purely decorative,
// so the blocks are hidden from screen readers, which hear "Loading" once.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./PageSkeleton.module.css";

const block = (...names: string[]) =>
  [styles.block, ...names].join(" ");

export default function PageSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Loading">
      <div className={styles.header} aria-hidden="true">
        <div className={block(styles.title)} />
        <div className={block(styles.subtitle)} />
      </div>

      <div className={styles.tiles} aria-hidden="true">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className={styles.card}>
            <div className={block(styles.line, styles.short)} />
            <div className={block(styles.tall)} />
          </div>
        ))}
      </div>

      <div className={`${styles.card} ${styles.large}`} aria-hidden="true">
        <div className={block(styles.line, styles.short)} />
        <div className={block(styles.line)} />
        <div className={block(styles.line, styles.medium)} />
        <div className={block(styles.line)} />
        <div className={block(styles.line, styles.medium)} />
      </div>
    </div>
  );
}
