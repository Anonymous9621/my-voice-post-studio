import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Feather, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generatePosts } from "@/lib/ai.functions";
import { generationQuery, profileQuery, stylesQuery, usageQuery } from "@/lib/queries";
import {
  MARKETING_GOALS,
  OUTPUT_LANGUAGES,
  TONES,
  type WritingMode,
} from "@/lib/content-options";
import type { GenerationBrief } from "@/lib/content-types";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigNotice, useAiConfigured } from "@/components/app/config-notice";
import { PageContainer, PageHeader } from "@/components/app/page";
import { EMPTY_IMAGE, ImageUpload, type ImageState } from "@/components/create/image-upload";

const searchSchema = z.object({
  style: z.string().optional(),
  from: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/create")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ from: search.from }),
  head: () => pageMeta("Create post", "Write three social post variations for your product."),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(stylesQuery),
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(usageQuery),
      deps.from ? context.queryClient.ensureQueryData(generationQuery(deps.from)) : null,
    ]);
  },
  component: CreatePage,
});

const briefSchema = z.object({
  product: z.string().trim().min(2, "Add the product or service"),
  description: z.string().trim().min(10, "Describe what it is and why people like it (10+ characters)"),
  promotion: z.string(),
  audience: z.string(),
  goal: z.string(),
  tone: z.string(),
  language: z.string(),
  cta: z.string(),
});

type Errors = Partial<Record<keyof GenerationBrief | "style", string>>;

const LOADING_LINES = [
  "Reading your brief…",
  "Matching your voice…",
  "Drafting three different angles…",
  "Cutting the clichés…",
];

function CreatePage() {
  const search = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const generate = useServerFn(generatePosts);
  const { configured, loading: statusLoading } = useAiConfigured();

  const { data: styles } = useSuspenseQuery(stylesQuery);
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: usage } = useSuspenseQuery(usageQuery);
  const source = queryClient.getQueryData(generationQuery(search.from ?? "").queryKey);

  const defaultStyle = search.style ?? styles.find((s) => s.is_default)?.id ?? styles[0]?.id ?? "";
  const sourceInputs = (source?.inputs ?? null) as Partial<GenerationBrief> | null;

  const [mode, setMode] = useState<WritingMode>(
    (source?.mode as WritingMode | undefined) ?? (styles.length ? "my_voice" : "natural"),
  );
  const [styleId, setStyleId] = useState<string>(source?.style_profile_id ?? defaultStyle);
  const [brief, setBrief] = useState<GenerationBrief>({
    product: sourceInputs?.product ?? "",
    description: sourceInputs?.description ?? "",
    promotion: sourceInputs?.promotion ?? "",
    audience: sourceInputs?.audience ?? "",
    goal: sourceInputs?.goal ?? MARKETING_GOALS[0],
    tone: sourceInputs?.tone ?? (styles.length ? "Match my style" : "Warm and friendly"),
    language: sourceInputs?.language ?? profile?.default_language ?? "English",
    cta: sourceInputs?.cta ?? "",
  });
  const [image, setImage] = useState<ImageState>(
    source?.image_path
      ? { path: source.image_path, previewUrl: source.imageUrl, notes: source.image_notes ?? "", missing: [] }
      : EMPTY_IMAGE,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    if (!submitting) return;
    const t = setInterval(() => setLineIdx((i) => (i + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(t);
  }, [submitting]);

  const remaining = Math.max(0, usage.plan.monthlyGenerations - usage.generationsUsed);
  const outOfGenerations = remaining === 0;
  const set = <K extends keyof GenerationBrief>(k: K, v: GenerationBrief[K]) => {
    setBrief((b) => ({ ...b, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const questions = useMemo(
    () => (Array.isArray(source?.clarifying_questions) ? (source.clarifying_questions as string[]) : []),
    [source],
  );

  async function submit() {
    setFormError(null);
    const parsed = briefSchema.safeParse(brief);
    const next: Errors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof GenerationBrief] = issue.message;
    }
    if (mode === "my_voice" && !styleId) next.style = "Choose a writing style or switch to Natural mode.";
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await generate({
        data: {
          mode,
          styleProfileId: mode === "my_voice" ? styleId : null,
          brief: { ...brief, language: brief.language as (typeof OUTPUT_LANGUAGES)[number] },
          imagePath: image.path,
          imageNotes: image.notes.trim() || null,
        },
      });
      if (!res.ok) {
        setFormError(res.error);
        if (res.code !== "limit_reached") toast.error(res.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["generations"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
      navigate({ to: "/generations/$id", params: { id: res.data.id } });
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabledReason = !configured && !statusLoading ? "Requires configuration" : outOfGenerations ? "Monthly limit reached" : null;

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow="Create"
        title="New post"
        description="Tell us about the product. We'll draft three different posts you can edit."
      />
      <ConfigNotice className="mb-6" />

      {questions.length > 0 && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-foreground">
          <p className="mb-1.5 font-medium">Last time we needed a few details:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {/* Mode */}
        <Card title="Writing mode">
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeOption
              active={mode === "my_voice"}
              onClick={() => setMode("my_voice")}
              icon={<Feather className="size-4" />}
              title="My Voice"
              text="Follows one of your saved writing styles."
            />
            <ModeOption
              active={mode === "natural"}
              onClick={() => setMode("natural")}
              icon={<MessageCircle className="size-4" />}
              title="Natural"
              text="Conversational, no AI clichés or emoji overload."
            />
          </div>
          {mode === "my_voice" && (
            <div className="mt-4 space-y-1.5">
              <Label>Writing style</Label>
              {styles.length ? (
                <Select value={styleId} onValueChange={(v) => { setStyleId(v); setErrors((e) => ({ ...e, style: undefined })); }}>
                  <SelectTrigger className={cn("h-11", errors.style && "border-destructive")}>
                    <SelectValue placeholder="Choose a style" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-muted-foreground">
                  You don't have a writing style yet.{" "}
                  <Link to="/styles/new" className="font-medium text-foreground underline underline-offset-4">
                    Create one
                  </Link>{" "}
                  or use Natural mode.
                </p>
              )}
              <FieldError msg={errors.style} />
            </div>
          )}
        </Card>

        {/* Product */}
        <Card title="Product">
          <Field label="Product or service" error={errors.product} htmlFor="product">
            <Input id="product" className="h-11" value={brief.product} maxLength={160} onChange={(e) => set("product", e.target.value)} placeholder="e.g. Hand-thrown ceramic mug" />
          </Field>
          <Field
            label="Description and key selling points"
            error={errors.description}
            htmlFor="description"
            hint="Only facts you're happy to publish. We won't add claims you don't mention."
          >
            <Textarea id="description" className="min-h-28" value={brief.description} maxLength={3000} onChange={(e) => set("description", e.target.value)} placeholder="What is it, what makes it different, who makes it…" />
          </Field>
          <Field label="Promotion or offer" htmlFor="promotion" hint="Optional. Include exact prices, codes and end dates if you want them mentioned.">
            <Textarea id="promotion" className="min-h-16" value={brief.promotion} maxLength={1000} onChange={(e) => set("promotion", e.target.value)} placeholder="e.g. 15% off with code MUG15 until Sunday" />
          </Field>
          <div className="space-y-1.5">
            <Label>Product photo</Label>
            <ImageUpload userId={user.id} value={image} onChange={setImage} aiConfigured={configured} />
          </div>
        </Card>

        {/* Audience */}
        <Card title="Audience and goal">
          <Field label="Target audience" htmlFor="audience">
            <Input id="audience" className="h-11" value={brief.audience} maxLength={500} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. Coffee lovers who buy handmade gifts" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marketing goal">
              <SimpleSelect value={brief.goal} onChange={(v) => set("goal", v)} options={MARKETING_GOALS} />
            </Field>
            <Field label="Desired tone">
              <SimpleSelect value={brief.tone} onChange={(v) => set("tone", v)} options={TONES} />
            </Field>
            <Field label="Output language">
              <SimpleSelect value={brief.language} onChange={(v) => set("language", v)} options={OUTPUT_LANGUAGES} />
            </Field>
            <Field label="Call to action" htmlFor="cta">
              <Input id="cta" className="h-11" value={brief.cta} maxLength={300} onChange={(e) => set("cta", e.target.value)} placeholder="e.g. Shop via link in bio" />
            </Field>
          </div>
        </Card>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/90 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          {formError && <p className="mb-3 text-sm text-destructive">{formError}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="brand"
              size="lg"
              className="w-full sm:w-auto"
              onClick={submit}
              disabled={submitting || statusLoading || disabledReason !== null}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {submitting ? LOADING_LINES[lineIdx] : disabledReason ?? "Write 3 variations"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {remaining} of {usage.plan.monthlyGenerations} generations left this month
            </span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface space-y-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className={cn(error && "[&_input]:border-destructive [&_textarea]:border-destructive")}>{children}</div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

function SimpleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModeOption({
  active,
  onClick,
  icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
        active ? "border-foreground bg-card shadow-card" : "bg-secondary/40 hover:bg-secondary",
      )}
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}
