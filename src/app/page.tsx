// ─────────────────────────────────────────────────────────────────────────────
// Home page (finely.com/)
//
// In plain words: the public landing page that introduces Finely. It's built
// from sections stacked top to bottom: the hero (headline + phone picture),
// features, pricing, and the footer.
// ─────────────────────────────────────────────────────────────────────────────

import Hero from "@/components/home/hero/Hero";
import Features from "@/components/home/features/Features";
import Pricing from "@/components/home/pricing/Pricing";
import Footer from "@/components/common/footer/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
