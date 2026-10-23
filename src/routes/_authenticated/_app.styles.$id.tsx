import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, PenLine, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { styleQuery } from "@/lib/queries";
import { hasAnalysis, type StyleAnalysis } from "@/lib/content-types";
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
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfigNotice } from "@/components/app/config-notice";
import { PageContainer } from "@/components/app/page";
import { StyleAnalysisView } from "@/components/styles/style-analysis-view";
import { StyleCreateForm } from "@/components/styles/style-create-form";

export const Route = createFileRoute("/_authenticated/_app/styles/$id")({
  head: () => pageMeta("Writing style", "Review and edit your writing style profile."),
  loader: async ({ context, params }) => {
    const style = await context.queryClient.ensureQueryData(styleQuery(params.id));
    if (!style) throw notFound();
  },
  notFoundComponent: () => (
    <PageContainer>
      <p className="text-muted-foreground">This writing style doesn't exist.</p>
      <Button asChild variant="link" className="px-0">
        <Link to="/styles">Back to writing styles</Link>
      </Button>
    </PageContainer>
  ),
  component: StyleDetail,
});

function StyleDetail() {
  const { id } = Route.useParams();
  const { data: style } = useSuspenseQuery(styleQuery(id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(style?.name ?? "");
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState<null | "rename" | "default" | "delete">(null);
  const [samplesOpen, setSamplesOpen] = useState(false);

  if (!style) return null;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["styles"] }),
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
    ]);

  async function rename() {
    const next = name.trim();
    if (!next) return toast.error("Name can't be empty.");
    setBusy("rename");
    const { error } = await supabase.from("style_profiles").update({ name: next.slice(0, 80) }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    setRenaming(false);
    await refresh();
    toast.success("Renamed");
  }

  async function makeDefault() {
    setBusy("default");
    await supabase.from("style_profiles").update({ is_default: false }).neq("id", id).eq("is_default", true);
    const { error } = await supabase.from("style_profiles").update({ is_default: true }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Set as default style");
  }

  async function remove() {
    setBusy("delete");
    const { error } = await supabase.from("style_profiles").delete().eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    queryClient.removeQueries({ queryKey: ["styles", id] });
    await refresh();
    toast.success("Style deleted");
    navigate({ to: "/styles" });
  }

  async function saveAnalysis(next: StyleAnalysis) {
    const { error } = await supabase
      .from("style_profiles")
      .update({ analysis: next as unknown as Json })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await refresh();
    toast.success("Style profile updated");
  }

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to="/styles">
          <ArrowLeft /> Writing styles
        </Link>
      </Button>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex max-w-md items-center gap-2">
              <Input
                autoFocus
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rename()}
                className="h-11 text-lg"
              />
              <Button size="icon" onClick={rename} disabled={busy === "rename"} aria-label="Save name">
                {busy === "rename" ? <Loader2 className="animate-spin" /> : <Check />}
              </Button>
            </div>
          ) : (
            <h1 className="flex items-center gap-3 font-display text-4xl leading-tight sm:text-[44px]">
              {style.name}
              <button
                onClick={() => setRenaming(true)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Rename"
              >
                <PenLine className="size-4" />
              </button>
            </h1>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {style.is_default && (
              <Badge variant="brand">
                <Star className="size-3" /> Default
              </Badge>
            )}
            {style.language && <Badge variant="outline">{style.language}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!style.is_default && (
            <Button variant="outline" onClick={makeDefault} disabled={busy !== null}>
              <Star /> Make default
            </Button>
          )}
          <Button asChild variant="brand">
            <Link to="/create" search={{ style: id }}>
              Write with this style
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete style">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{style.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  The style profile and its samples will be removed. Posts you already generated stay in your history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete style
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <ConfigNotice className="mb-6" />

      {hasAnalysis(style.analysis) ? (
        <StyleAnalysisView analysis={style.analysis} onSave={saveAnalysis} />
      ) : (
        <div className="surface p-6 text-sm text-muted-foreground">
          This style hasn't been analyzed yet. Add samples below and run the analysis.
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Style profiles are an approximation of how you write. Always review generated posts before publishing.
      </p>

      <Collapsible open={samplesOpen} onOpenChange={setSamplesOpen} className="mt-8">
        <div className="surface p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Samples</h2>
              <p className="text-sm text-muted-foreground">Add or change posts, then re-analyze.</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                {samplesOpen ? "Close" : "Edit samples"}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-6">
            <StyleCreateForm
              styleId={id}
              defaultName={style.name}
              initialSamples={style.sample_posts}
              submitLabel="Re-analyze"
              onCreated={() => {
                setSamplesOpen(false);
                queryClient.invalidateQueries({ queryKey: ["styles", id] });
              }}
            />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </PageContainer>
  );
}
