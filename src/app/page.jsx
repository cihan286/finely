import Hero from "@/components/home/hero/Hero";
import Features from "@/components/home/features/Features";
import Pricing from "@/components/home/pricing/Pricing";
import Footer from "@/components/common/footer/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
