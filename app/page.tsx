import HeroCanvas from "@/components/home/HeroCanvas";
import HeroSection from "@/components/home/HeroSection";
import CardGrid from "@/components/home/CardGrid";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      <HeroCanvas />
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10">
        <HeroSection />
        <CardGrid />
      </div>
    </main>
  );
}
