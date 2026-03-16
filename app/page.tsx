import HeroCanvas from "@/components/home/HeroCanvas";
import HeroSection from "@/components/home/HeroSection";
import CardGrid from "@/components/home/CardGrid";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background">
      <HeroCanvas />
      <div className="relative z-10">
        <HeroSection />
        <CardGrid />
      </div>
    </main>
  );
}
