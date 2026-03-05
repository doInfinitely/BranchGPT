import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { Pricing } from "@/components/landing/Pricing";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <FeatureShowcase />
      <Pricing />
    </>
  );
}
