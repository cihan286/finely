// ─────────────────────────────────────────────────────────────────────────────
// "Try the demo" button
//
// In plain words: opens a ready-made pretend company, full of sample data, so
// visitors can look around Finely without signing up (lib/data/demo.ts). It
// takes a few seconds; meanwhile the button says "Opening demo".
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useTransition } from "react";
import { PlayCircle } from "lucide-react";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import { startDemoAction } from "@/app/demo-actions";
import styles from "./DemoButton.module.css";

export default function DemoButton({ variant = "secondary" }: { variant?: "primary" | "secondary" | "outline" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    setError(null);
    startTransition(async () => {
      // On success the action opens the dashboard and this never returns
      const result = await startDemoAction(Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className={styles.wrapper}>
      <Button
        variant={variant}
        text={pending ? "Opening demo" : "Try the demo"}
        icon={<PlayCircle size="1em" />}
        iconPosition="right"
        loading={pending}
        disabled={pending}
        action={start}
      />
      {error && <Message type="error">{error}</Message>}
    </div>
  );
}
