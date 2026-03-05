import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { Pricing } from "@/components/landing/Pricing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <FeatureShowcase />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
