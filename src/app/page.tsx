import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeaturesSection, WhyMattersSection } from "@/components/landing/FeaturesAndWhySection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <WhyMattersSection />
      <Footer />
    </>
  );
}
