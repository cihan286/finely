import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import styles from "@/components/auth/AuthForm.module.css";
import { isGoogleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  if (await getSession()) redirect("/dashboard");
  const { reset } = await searchParams;

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Log in to your Finely account.</p>
      </div>

      <LoginForm
        googleEnabled={isGoogleEnabled}
        notice={
          reset === "success"
            ? "Your password was changed. Log in with your new password."
            : undefined
        }
      />

      <p className={styles.footer}>
        New to Finely?{" "}
        <Link href="/signup" className={styles.link}>
          Create an account
        </Link>
      </p>
    </>
  );
}
