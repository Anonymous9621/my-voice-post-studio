import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  BookmarkCheck,
  Camera,
  Check,
  Copy,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { regeneratePost } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

type Post = Tables<"posts">;

const QUICK = ["Shorter", "Different hook", "More personal", "Fewer emojis", "More playful"];

export function postText(p: Pick<Post, "hook" | "caption" | "cta">) {
  return [p.hook, p.caption, p.cta].map((s) => s.trim()).filter(Boolean).join("\n\n");
}

export function PostCard({
  post,
  label,
  source,
  canRegenerate = true,
}: {
  post: Post;
  label: string;
  source?: { id: string; title: string } | null;
  canRegenerate?: boolean;
}) {
  const queryClient = useQueryClient();
  const regenerate = useServerFn(regeneratePost);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post);
  const [busy, setBusy] = useState<null | "save" | "regen" | "bookmark" | "delete">(null);
  const [copied, setCopied] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["generations"] }),
      queryClient.invalidateQueries({ queryKey: ["posts"] }),
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
    ]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(postText(post));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }

  async function save() {
    if (!draft.hook.trim() && !draft.caption.trim()) return void toast.error("A post needs a hook or caption.");
    setBusy("save");
    const { error } = await supabase
      .from("posts")
      .update({
        hook: draft.hook,
        caption: draft.caption,
        cta: draft.cta,
        visual_direction: draft.visual_direction,
      })
      .eq("id", post.id);
    setBusy(null);
    if (error) return void toast.error(error.message);
    setEditing(false);
    await invalidate();
    toast.success("Post updated");
  }

  async function toggleSaved() {
    setBusy("bookmark");
    const { error } = await supabase.from("posts").update({ is_saved: !post.is_saved }).eq("id", post.id);
    setBusy(null);
    if (error) return void toast.error(error.message);
    await invalidate();
    toast.success(post.is_saved ? "Removed from saved" : "Saved to your library");
  }

  async function remove() {
    setBusy("delete");
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setBusy(null);
    if (error) return void toast.error(error.message);
    await invalidate();
    toast.success("Post deleted");
  }

  async function runRegen(extra: string | null) {
    setRegenOpen(false);
    setBusy("regen");
    try {
      const res = await regenerate({ data: { postId: post.id, instruction: extra?.trim() || null } });
      if (!res.ok) return void toast.error(res.error);
      setInstruction("");
      await invalidate();
      toast.success("New version ready");
    } catch {
      toast.error("Couldn't regenerate. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const regenerating = busy === "regen";

  return (
    <article className={cn("surface flex flex-col p-5 sm:p-6", regenerating && "opacity-70")}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
          {source && (
            <Link
              to="/generations/$id"
              params={{ id: source.id }}
              className="truncate text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              · {source.title}
            </Link>
          )}
        </div>
        {post.is_saved && !editing && (
          <span className="inline-flex items-center gap-1 text-xs text-accent-foreground">
            <BookmarkCheck className="size-3.5" /> Saved
          </span>
        )}
      </header>

      {regenerating ? (
        <div className="space-y-3 py-2">
          <div className="h-5 w-4/5 rounded animate-shimmer bg-secondary" />
          <div className="h-3 w-full rounded animate-shimmer bg-secondary" />
          <div className="h-3 w-11/12 rounded animate-shimmer bg-secondary" />
          <div className="h-3 w-2/3 rounded animate-shimmer bg-secondary" />
          <p className="pt-1 text-xs text-muted-foreground">Writing a new version…</p>
        </div>
      ) : editing ? (
        <div className="space-y-4">
          <EditField label="Hook">
            <Textarea value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} className="min-h-14 text-[15px] font-medium" />
          </EditField>
          <EditField label="Caption" count={draft.caption.length}>
            <Textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} className="min-h-44 text-[15px] leading-relaxed" />
          </EditField>
          <EditField label="Call to action">
            <Input value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
          </EditField>
          <EditField label="Visual direction">
            <Textarea value={draft.visual_direction} onChange={(e) => setDraft({ ...draft, visual_direction: e.target.value })} className="min-h-16 text-sm" />
          </EditField>
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy === "save"}>
              {busy === "save" && <Loader2 className="animate-spin" />} Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <p className="text-[17px] font-semibold leading-snug text-foreground">{post.hook}</p>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/85">{post.caption}</p>
          {post.cta && <p className="mt-3 text-[15px] font-medium text-foreground">{post.cta}</p>}
          {post.visual_direction && (
            <div className="mt-5 flex gap-2.5 rounded-lg bg-secondary/70 px-3 py-2.5 text-sm text-muted-foreground">
              <Camera className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-medium text-foreground">Visual: </span>
                {post.visual_direction}
              </p>
            </div>
          )}
        </div>
      )}

      {!editing && (
        <footer className="mt-5 flex flex-wrap items-center gap-1 border-t pt-4">
          <Button variant="outline" size="sm" onClick={copy} disabled={regenerating}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleSaved} disabled={busy !== null}>
            {post.is_saved ? <BookmarkCheck /> : <Bookmark />} {post.is_saved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(post);
              setEditing(true);
            }}
            disabled={busy !== null}
          >
            <Pencil /> Edit
          </Button>
          {canRegenerate && (
            <Popover open={regenOpen} onOpenChange={setRegenOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={busy !== null}>
                  <RefreshCw /> Regenerate
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <p className="text-sm font-medium">Regenerate this post</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Replaces this version. Uses 1 generation.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => runRegen(q)}
                      className="rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-secondary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={instruction}
                    maxLength={300}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Or describe what to change…"
                    className="h-9 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && runRegen(instruction)}
                  />
                  <Button size="sm" className="h-9" onClick={() => runRegen(instruction)}>
                    Go
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto" disabled={busy !== null} aria-label="Delete post">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>This variation will be removed permanently.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </footer>
      )}
    </article>
  );
}

function EditField({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        {count !== undefined && <span className="tabular-nums text-muted-foreground">{count} characters</span>}
      </div>
      {children}
    </div>
  );
}
