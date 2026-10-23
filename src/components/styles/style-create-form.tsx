import { useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { analyzeStyle } from "@/lib/ai.functions";
import { splitSamples } from "@/lib/content-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAiConfigured } from "@/components/app/config-notice";

const MIN_CHARS = 200;

export function StyleCreateForm({
  onCreated,
  defaultName = "My voice",
  secondaryAction,
  styleId = null,
  initialSamples = "",
  submitLabel = "Analyze my style",
}: {
  onCreated: (id: string) => void;
  defaultName?: string;
  secondaryAction?: ReactNode;
  styleId?: string | null;
  initialSamples?: string;
  submitLabel?: string;
}) {
  const analyze = useServerFn(analyzeStyle);
  const queryClient = useQueryClient();
  const { configured, loading: statusLoading } = useAiConfigured();
  const [name, setName] = useState(defaultName);
  const [samples, setSamples] = useState(initialSamples);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postCount = useMemo(() => splitSamples(samples).length, [samples]);
  const chars = samples.trim().length;
  const enough = chars >= MIN_CHARS;

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Give your style a name.");
    if (!enough) return setError(`Paste at least ${MIN_CHARS} characters of your own posts.`);
    setBusy(true);
    try {
      const res = await analyze({ data: { styleId, name: name.trim(), samples } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["styles"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
      toast.success(styleId ? "Style re-analyzed" : "Writing style saved");
      onCreated(res.data.id);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!styleId && (
        <div className="space-y-1.5">
          <Label htmlFor="style-name">Style name</Label>
          <Input
            id="style-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Instagram — shop voice"
            className="h-11 max-w-sm"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex items-end justify-between gap-3">
          <Label htmlFor="samples">Your posts</Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {postCount} {postCount === 1 ? "post" : "posts"} · {chars.toLocaleString()} characters
          </span>
        </div>
        <Textarea
          id="samples"
          value={samples}
          onChange={(e) => setSamples(e.target.value)}
          placeholder={`Paste 3–10 posts you wrote yourself.\nSeparate posts with a line containing ---\n\nExample:\nnew drop this friday 🌿 small batch, hand-poured…\n---\nhonestly didn't expect this candle to sell out twice…`}
          className="min-h-64 resize-y bg-card font-[inherit] text-[15px] leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">
          Use real posts in your own words — captions, threads, newsletters. More variety gives a better profile. The
          result is an approximation of your style, not a perfect copy.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="brand"
          size="lg"
          onClick={submit}
          disabled={busy || statusLoading || !configured}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy ? "Reading your posts…" : configured || statusLoading ? submitLabel : "Requires configuration"}
        </Button>
        {secondaryAction}
      </div>
    </div>
  );
}
