import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap, Brain, BarChart3 } from "lucide-react";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              C2
            </div>
            <span className="font-semibold">Concept2 Analytics</span>
          </div>
          <Link href="/api/auth/concept2">
            <Button>Connect Concept2 Logbook</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Unlock the full power of your{" "}
              <span className="text-primary">rowing data</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect your Concept2 Logbook and get AI-powered stroke-by-stroke
              analysis, performance trends, and personalised coaching insights
              from every workout.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/api/auth/concept2">
                <Button size="lg" className="text-base px-8">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-card/50">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6" />}
                title="Stroke-Level Data"
                description="Parse every stroke from your Concept2 CSV files for granular analysis far beyond what any app shows."
              />
              <FeatureCard
                icon={<Brain className="h-6 w-6" />}
                title="AI Coaching"
                description="Get personalised coaching feedback and grading from Claude AI after every single workout."
              />
              <FeatureCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="Trend Analysis"
                description="Track your fitness trajectory, pacing consistency, and power development over 90-day windows."
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6" />}
                title="Auto-Sync"
                description="New workouts are automatically imported and analysed within minutes of logging them on your erg."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Built for indoor rowers. Powered by Concept2 API and Claude AI.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
