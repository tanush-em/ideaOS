import Link from "next/link";
import {
  ArrowRight,
  GitBranch,
  Lightbulb,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

const steps = [
  {
    icon: Lightbulb,
    title: "Brainstorm & critique",
    description:
      "Specialized agents expand your idea, then attack weak assumptions before you waste months building.",
  },
  {
    icon: Search,
    title: "Research with evidence",
    description:
      "Web Scout finds competitors, trends, and user pain — every claim linked to a source.",
  },
  {
    icon: GitBranch,
    title: "Branch like Git",
    description:
      "Explore B2B vs B2C, AI-first vs marketplace — compare branches side by side.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Sparkles className="size-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">IdeaOS</span>
        </div>
        <nav className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href={ctaHref}>{user ? "Dashboard" : "Sign in"}</Link>
          </Button>
          <Button asChild>
            <Link href={ctaHref}>
              Start exploring
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="mr-1 size-3" />
            Built for founders
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl sm:leading-[1.1]">
            Git for product ideas.
            <span className="block text-primary">Research-backed blueprints.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            IdeaOS orchestrates a team of AI agents to brainstorm, challenge,
            research, and refine your startup concept into an implementation-ready
            blueprint — with branching, evidence, and full audit trail.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={ctaHref}>
                Explore an idea
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>

        <div
          id="how-it-works"
          className="mt-32 grid gap-6 sm:grid-cols-3"
        >
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="size-5 text-primary" />
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-24 rounded-2xl border border-border/60 bg-card/30 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                From vague idea to MVP spec
              </h2>
              <p className="mt-4 text-muted-foreground">
                Not another chatbot. A multi-stage agent pipeline with structured
                outputs, adversarial critique, and founder-focused blueprints
                including kill criteria and 2-week MVP scope.
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/80 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              <div className="text-primary">Raw Idea</div>
              <div className="ml-2">↓ Ideation</div>
              <div className="ml-2">↓ Expansion</div>
              <div className="ml-2">↓ Critique</div>
              <div className="ml-2">↓ Web Research</div>
              <div className="ml-2">↓ Market Analysis</div>
              <div className="ml-2">↓ Refinement</div>
              <div className="ml-2">↓ Blueprint</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        IdeaOS — Agentic Product Discovery for Founders
      </footer>
    </div>
  );
}
