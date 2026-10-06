import type { Metadata } from "next";
import DashboardHome from "@/components/dashboard/home/DashboardHome";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  return <DashboardHome firstName={user.name.split(" ")[0]} />;
}
