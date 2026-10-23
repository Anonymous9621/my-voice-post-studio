import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";

import { savedPostsQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer, PageHeader } from "@/components/app/page";
import { PostCard } from "@/components/posts/post-card";

export const Route = createFileRoute("/_authenticated/_app/saved")({
  head: () => pageMeta("Saved posts", "Posts you've saved for later."),
  loader: ({ context }) => context.queryClient.ensureQueryData(savedPostsQuery),
  component: SavedPage,
});

function SavedPage() {
  const { data } = useSuspenseQuery(savedPostsQuery);
  return (
    <PageContainer>
      <PageHeader eyebrow="Library" title="Saved posts" description="Your keepers, ready to copy and publish." />
      {data.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved posts"
          description="Tap Save on any variation you like and it will be kept here."
          action={
            <Button asChild variant="outline">
              <Link to="/history">Browse history</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              label="Saved"
              source={p.generations ? { id: p.generations.id, title: p.generations.title } : null}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
