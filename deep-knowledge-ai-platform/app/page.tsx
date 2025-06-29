import { AnimatedBackground } from "@/components/layout/AnimatedBackground";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { ExamplePreviewSection } from "@/components/sections/ExamplePreviewSection";

export default function LandingPage(): React.JSX.Element {
  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
        <Navigation />
      </div>

      <div className="relative z-10">
        <HeroSection />

        <FeaturesSection />

        <ExamplePreviewSection />

        <Footer />
      </div>
    </div >
  );
}
