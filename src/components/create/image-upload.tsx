import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { analyzeProductImage } from "@/lib/ai.functions";
import type { ImageInsights } from "@/lib/content-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ImageState {
  path: string | null;
  previewUrl: string | null;
  notes: string;
  missing: string[];
}

export const EMPTY_IMAGE: ImageState = { path: null, previewUrl: null, notes: "", missing: [] };

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function insightsToNotes(i: ImageInsights) {
  const lines = [
    i.product_type && `Product: ${i.product_type}`,
    i.summary,
    i.visible_details.length ? `Visible: ${i.visible_details.join("; ")}` : "",
    i.visible_text.length ? `Text on product: ${i.visible_text.join(" / ")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function ImageUpload({
  userId,
  value,
  onChange,
  aiConfigured,
}: {
  userId: string;
  value: ImageState;
  onChange: (next: ImageState) => void;
  aiConfigured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeProductImage);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(path: string, base: ImageState) {
    if (!aiConfigured) return;
    setStatus("analyzing");
    try {
      const res = await analyze({ data: { path } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChange({ ...base, notes: insightsToNotes(res.data), missing: res.data.not_determinable });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    } catch {
      setError("We couldn't analyze the photo. You can describe it yourself below.");
    } finally {
      setStatus("idle");
    }
  }

  async function onFile(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Images must be 8 MB or smaller.");
    setStatus("uploading");
    const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setStatus("idle");
      setError("Upload failed. Please try again.");
      toast.error(upErr.message);
      return;
    }
    const base: ImageState = { path, previewUrl: URL.createObjectURL(file), notes: "", missing: [] };
    onChange(base);
    setStatus("idle");
    await runAnalysis(path, base);
  }

  function clear() {
    if (value.path) supabase.storage.from("product-images").remove([value.path]);
    onChange(EMPTY_IMAGE);
    setError(null);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {!value.previewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          disabled={status !== "idle"}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-secondary/40 px-4 py-8 text-center transition-colors hover:bg-secondary"
        >
          {status === "uploading" ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {status === "uploading" ? "Uploading…" : "Add a product photo"}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 8 MB · optional</span>
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-3 sm:flex-row">
          <div className="relative shrink-0">
            <img src={value.previewUrl} alt="Product" className="h-40 w-full rounded-lg object-cover sm:w-40" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={clear}
              className="absolute right-1.5 top-1.5 size-7 rounded-full"
              aria-label="Remove photo"
            >
              <X />
            </Button>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="image-notes" className="flex items-center gap-1.5">
                <Eye className="size-3.5" /> What's in the photo
              </Label>
              {aiConfigured && value.path && status === "idle" && (
                <button
                  type="button"
                  onClick={() => runAnalysis(value.path!, value)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="size-3" /> Re-analyze
                </button>
              )}
            </div>
            {status === "analyzing" ? (
              <div className="space-y-2 py-1">
                <div className="h-3 w-3/4 rounded animate-shimmer bg-secondary" />
                <div className="h-3 w-1/2 rounded animate-shimmer bg-secondary" />
                <p className="text-xs text-muted-foreground">Looking at visible details…</p>
              </div>
            ) : (
              <>
                <Textarea
                  id="image-notes"
                  value={value.notes}
                  onChange={(e) => onChange({ ...value, notes: e.target.value })}
                  placeholder={
                    aiConfigured
                      ? "Visible details will appear here."
                      : "Photo analysis requires configuration. Describe what's visible in the photo."
                  }
                  className="min-h-24 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Check this and fix anything that's wrong — posts only use details you confirm.
                </p>
                {value.missing.length > 0 && (
                  <p className="text-xs text-warning-foreground">
                    Can't be confirmed from the photo: {value.missing.join(", ")}. Add these to the description if
                    you want them mentioned.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
