// ─────────────────────────────────────────────────────────────────────────────
// "Try the demo" button
//
// In plain words: opens a ready-made pretend company, full of sample data, so
// visitors can look around Finely without signing up (lib/data/demo.ts). It
// takes a few seconds; meanwhile the button says "Opening demo".
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import Button from "@/components/common/button/Button";
import { useNotify } from "@/components/common/notice/Notice";
import { startDemoAction } from "@/app/demo-actions";
import { useI18n } from "@/i18n/client";
import styles from "./DemoButton.module.css";

export default function DemoButton({ variant = "secondary" }: { variant?: "primary" | "secondary" | "outline" }) {
  const { m } = useI18n();
  const [pending, startTransition] = useTransition();
  const notify = useNotify();
  const showError = (text: string) => notify({ type: "error", text });

  const start = () => {
    startTransition(async () => {
      // On success the action opens the dashboard and this never returns
      const result = await startDemoAction(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (result?.error) showError(result.error);
    });
  };

  return (
    <div className={styles.wrapper}>
      <Button
        variant={variant}
        text={pending ? m.home.demo.opening : m.home.demo.try}
        icon={<PlayCircle size="1em" />}
        iconPosition="right"
        loading={pending}
        disabled={pending}
        action={start}
      />
    </div>
  );
}
