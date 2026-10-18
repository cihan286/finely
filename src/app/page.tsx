// ─────────────────────────────────────────────────────────────────────────────
// Home page (finely.com/)
//
// In plain words: the public landing page that introduces Finely. It's built
// from sections stacked top to bottom: the hero (headline + phone picture),
// features, pricing, and the footer.
// ─────────────────────────────────────────────────────────────────────────────

import { getSession } from "@/lib/session";
import Hero from "@/components/home/hero/Hero";
import Features from "@/components/home/features/Features";
import Pricing from "@/components/home/pricing/Pricing";
import Footer from "@/components/common/footer/Footer";

export default async function Home() {
  // Logged-in people get a way back to their dashboard instead of "Log in"
  const signedIn = Boolean(await getSession());
  return (
    <>
      <main>
        <Hero signedIn={signedIn} />
        <Features />
        <Pricing />
      </main>
      <Footer signedIn={signedIn} />
    </>
  );
}
