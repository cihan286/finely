// ─────────────────────────────────────────────────────────────────────────────
// Loading state for every dashboard page
//
// In plain words: when someone clicks Dashboard, Transactions, Insights or
// Settings, this placeholder appears right away in the page area (the menu
// and top bar stay put) until the page's data has been fetched.
//
// For developers: a Next.js file convention. It wraps each page under
// /dashboard in a Suspense boundary and is shown while the page's server
// component is waiting for its data.
// ─────────────────────────────────────────────────────────────────────────────

import PageSkeleton from "@/components/dashboard/page-skeleton/PageSkeleton";

export default function DashboardLoading() {
  return <PageSkeleton />;
}
