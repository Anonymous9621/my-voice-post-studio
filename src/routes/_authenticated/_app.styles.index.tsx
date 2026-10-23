import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Fingerprint, Plus, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { stylesQuery, usageQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { hasAnalysis } from "@/lib/content-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfigNotice } from "@/components/app/config-notice";
import { EmptyState, PageContainer, PageHeader } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/_app/styles/")({
  head: () => pageMeta("Writing styles", "Your saved writing style profiles."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(stylesQuery),
      context.queryClient.ensureQueryData(usageQuery),
    ]),
  component: StylesPage,
});

function StylesPage() {
  const { data: styles } = useSuspenseQuery(stylesQuery);
  const { data: usage } = useSuspenseQuery(usageQuery);
  const atLimit = styles.length >= usage.plan.maxStyleProfiles;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Library"
        title="Writing styles"
        description="Each style is a reusable profile of how you write. Use different ones for different brands or platforms."
        actions={
          atLimit ? (
            <Button disabled title="Plan limit reached">
              <Plus /> New style
            </Button>
          ) : (
            <Button asChild>
              <Link to="/styles/new">
                <Plus /> New style
              </Link>
            </Button>
          )
        }
      />
      <ConfigNotice className="mb-6" />
      {atLimit && (
        <p className="mb-6 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          You're using {styles.length} of {usage.plan.maxStyleProfiles} writing styles on the {usage.plan.name} plan.
          Delete one to add another.
        </p>
      )}

      {styles.length === 0 ? (
        <EmptyState
          icon={Fingerprint}
          title="No writing styles yet"
          description="Paste a few of your own posts and we'll build a profile you can reuse in My Voice mode."
          action={
            <Button asChild variant="brand">
              <Link to="/styles/new">Create your first style</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {styles.map((s) => (
            <Link
              key={s.id}
              to="/styles/$id"
              params={{ id: s.id }}
              className="surface group block p-5 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{s.name}</h3>
                <div className="flex gap-1.5">
                  {s.is_default && (
                    <Badge variant="brand">
                      <Star className="size-3" /> Default
                    </Badge>
                  )}
                  {s.language && <Badge variant="outline">{s.language}</Badge>}
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {hasAnalysis(s.analysis) ? s.analysis.summary : "Not analyzed yet."}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Updated {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
