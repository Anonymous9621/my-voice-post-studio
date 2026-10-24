import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, FileQuestion, PenLine, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { generationQuery } from "@/lib/queries";
import { MODE_LABELS, type WritingMode } from "@/lib/content-options";
import type { GenerationBrief } from "@/lib/content-types";
import { pageMeta } from "@/lib/seo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageContainer } from "@/components/app/page";
import { PostCard } from "@/components/posts/post-card";

export const Route = createFileRoute("/_authenticated/_app/generations/$id")({
  head: () => pageMeta("Generated posts", "Review, edit and save your generated posts."),
  loader: async ({ context, params }) => {
    const gen = await context.queryClient.ensureQueryData(generationQuery(params.id));
    if (!gen) throw notFound();
  },
  notFoundComponent: () => (
    <PageContainer>
      <p className="text-muted-foreground">These posts don't exist or were deleted.</p>
      <Button asChild variant="link" className="px-0">
        <Link to="/history">Back to history</Link>
      </Button>
    </PageContainer>
  ),
  component: GenerationPage,
});

function GenerationPage() {
  const { id } = Route.useParams();
  const { data: gen } = useSuspenseQuery(generationQuery(id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!gen) return null;

  const brief = gen.inputs as unknown as GenerationBrief;
  const questions = Array.isArray(gen.clarifying_questions) ? (gen.clarifying_questions as string[]) : [];

  async function remove() {
    const { error } = await supabase.from("generations").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    if (gen?.image_path) await supabase.storage.from("product-images").remove([gen.image_path]);
    queryClient.removeQueries({ queryKey: ["generations", "detail", id] });
    await queryClient.invalidateQueries({ queryKey: ["generations"] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
    toast.success("Deleted");
    navigate({ to: "/history" });
  }

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to="/history">
          <ArrowLeft /> History
        </Link>
      </Button>

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge variant={gen.mode === "my_voice" ? "brand" : "secondary"}>
              {MODE_LABELS[gen.mode as WritingMode]}
            </Badge>
            {gen.style_profiles?.name && <Badge variant="outline">{gen.style_profiles.name}</Badge>}
            {brief.language && <Badge variant="outline">{brief.language}</Badge>}
          </div>
          <h1 className="font-display text-4xl leading-tight sm:text-[44px]">{gen.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(new Date(gen.created_at), "PPP 'at' p")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/create" search={{ from: id }}>
              <PenLine /> Edit brief &amp; write again
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete these posts?</AlertDialogTitle>
                <AlertDialogDescription>
                  All variations from this brief, including saved ones, will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="mb-6 flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
          <FileQuestion className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">A few details would make these posts more accurate</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs opacity-90">
              We left these out rather than guessing.{" "}
              <Link to="/create" search={{ from: id }} className="font-medium underline underline-offset-4">
                Add the details and write again
              </Link>
            </p>
          </div>
        </div>
      )}

      {gen.posts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No posts left"
          description="You deleted every variation. Write a fresh set from the same brief."
          action={
            <Button asChild variant="brand">
              <Link to="/create" search={{ from: id }}>
                Write again
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {gen.posts.map((p, i) => (
            <PostCard key={p.id} post={p} label={`Variation ${i + 1}`} />
          ))}
        </div>
      )}

      <details className="surface mt-8 p-5 text-sm">
        <summary className="cursor-pointer font-medium">Brief used</summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto]">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {(
              [
                ["Description", brief.description],
                ["Promotion", brief.promotion],
                ["Audience", brief.audience],
                ["Goal", brief.goal],
                ["Tone", brief.tone],
                ["Call to action", brief.cta],
                ["Photo details", gen.image_notes ?? ""],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-foreground">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {gen.imageUrl && <img src={gen.imageUrl} alt="Product" className="h-40 w-40 rounded-lg object-cover" />}
        </div>
      </details>
    </PageContainer>
  );
}
