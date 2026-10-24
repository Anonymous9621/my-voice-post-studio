import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Fingerprint, History, Plus, Sparkles, Star } from "lucide-react";

import { generationsQuery, profileQuery, stylesQuery, usageQuery } from "@/lib/queries";
import { hasAnalysis } from "@/lib/content-types";
import { pageMeta } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/app/config-notice";
import { EmptyState, PageContainer, SectionTitle } from "@/components/app/page";
import { UsageBar } from "@/components/app/usage-meter";
import { GenerationRow } from "@/components/posts/generation-row";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  head: () => pageMeta("Dashboard", "Your writing styles, recent posts and usage."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(stylesQuery),
      context.queryClient.ensureQueryData(generationsQuery(5)),
      context.queryClient.ensureQueryData(usageQuery),
    ]),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: styles } = useSuspenseQuery(stylesQuery);
  const { data: recent } = useSuspenseQuery(generationsQuery(5));
  const { data: usage } = useSuspenseQuery(usageQuery);
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <PageContainer>
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
      </div>

      <ConfigNotice className="mb-6" />

      <Link
        to="/create"
        className="group mb-8 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-lift sm:p-8"
      >
        <div>
          <p className="font-display text-3xl leading-tight sm:text-4xl">What are we posting today?</p>
          <p className="mt-1 text-sm opacity-75">Describe a product and get three posts in your voice.</p>
        </div>
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform group-hover:translate-x-1">
          <ArrowRight className="size-5" />
        </span>
      </Link>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-xs text-muted-foreground">Plan</p>
          <p className="mt-1 text-2xl font-semibold">{usage.plan.name}</p>
          <UsageBar className="mt-4" label="Generations" used={usage.generationsUsed} limit={usage.plan.monthlyGenerations} />
        </div>
        <div className="surface p-5">
          <p className="text-xs text-muted-foreground">Writing styles</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{usage.styleCount}</p>
          <UsageBar className="mt-4" label="Of your plan" used={usage.styleCount} limit={usage.plan.maxStyleProfiles} />
        </div>
        <div className="surface p-5">
          <p className="text-xs text-muted-foreground">Saved posts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{usage.savedCount}</p>
          <UsageBar className="mt-4" label="Photo analyses" used={usage.imageAnalysesUsed} limit={usage.plan.monthlyImageAnalyses} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionTitle
            action={
              <Link to="/styles" className="text-xs text-muted-foreground hover:text-foreground">
                View all
              </Link>
            }
          >
            Writing styles
          </SectionTitle>
          {styles.length === 0 ? (
            <EmptyState
              icon={Fingerprint}
              title="Add your writing style"
              description="Paste a few of your posts so My Voice mode can sound like you."
              action={
                <Button asChild size="sm" variant="brand">
                  <Link to="/styles/new">
                    <Plus /> Create style
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {styles.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  to="/styles/$id"
                  params={{ id: s.id }}
                  className="surface block p-4 transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{s.name}</p>
                    {s.is_default && (
                      <Badge variant="brand">
                        <Star className="size-3" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {hasAnalysis(s.analysis) ? s.analysis.summary : "Not analyzed yet."}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle
            action={
              <Link to="/history" className="text-xs text-muted-foreground hover:text-foreground">
                View all
              </Link>
            }
          >
            Recent posts
          </SectionTitle>
          {recent.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No posts yet"
              description="Your first set of posts will show up here."
              action={
                <Button asChild size="sm">
                  <Link to="/create">Create a post</Link>
                </Button>
              }
            />
          ) : (
            <div className="surface divide-y overflow-hidden">
              {recent.map((g) => (
                <GenerationRow key={g.id} generation={g} />
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <Link to="/history" className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <History className="size-3" /> Full history
            </Link>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
