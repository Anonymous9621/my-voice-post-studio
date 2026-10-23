import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { History, Plus } from "lucide-react";

import { generationsQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer, PageHeader } from "@/components/app/page";
import { GenerationRow } from "@/components/posts/generation-row";

export const Route = createFileRoute("/_authenticated/_app/history")({
  head: () => pageMeta("History", "Every brief you've turned into posts."),
  loader: ({ context }) => context.queryClient.ensureQueryData(generationsQuery(100)),
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useSuspenseQuery(generationsQuery(100));
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Library"
        title="History"
        description="Every brief you've turned into posts. Open one to edit, regenerate or save variations."
        actions={
          <Button asChild>
            <Link to="/create">
              <Plus /> New post
            </Link>
          </Button>
        }
      />
      {data.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing here yet"
          description="Your generated posts will show up here."
          action={
            <Button asChild variant="brand">
              <Link to="/create">Create your first post</Link>
            </Button>
          }
        />
      ) : (
        <div className="surface divide-y overflow-hidden">
          {data.map((g) => (
            <GenerationRow key={g.id} generation={g} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
