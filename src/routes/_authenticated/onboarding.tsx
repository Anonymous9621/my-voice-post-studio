import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { BUSINESS_TYPES, OUTPUT_LANGUAGES } from "@/lib/content-options";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/brand/logo";
import { ConfigNotice } from "@/components/app/config-notice";
import { PageSkeleton } from "@/components/app/page";
import { StyleCreateForm } from "@/components/styles/style-create-form";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => pageMeta("Welcome", "Set up your profile and writing style."),
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (profile?.onboarding_completed) throw redirect({ to: "/dashboard" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
  pendingComponent: PageSkeleton,
  component: Onboarding,
});

const STEPS = ["About you", "Your writing style", "Ready"];

function Onboarding() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [businessType, setBusinessType] = useState(profile?.business_type ?? "");
  const [language, setLanguage] = useState(profile?.default_language ?? "English");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdStyle, setCreatedStyle] = useState(false);

  async function saveProfile(complete: boolean) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("You're signed out. Please sign in again.");
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: auth.user.id,
        display_name: displayName.trim() || null,
        business_name: businessName.trim() || null,
        business_type: businessType || null,
        default_language: language,
        ...(complete ? { onboarding_completed: true } : {}),
      })
      .select("*")
      .single();
    if (error) throw error;
    queryClient.setQueryData(profileQuery.queryKey, data);
  }

  async function next() {
    setError(null);
    if (!displayName.trim()) return setError("Tell us what to call you.");
    setBusy(true);
    try {
      await saveProfile(false);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(withStyle: boolean) {
    setBusy(true);
    try {
      await saveProfile(true);
      setCreatedStyle(withStyle);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background bg-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Logo />
        <ol className="flex items-center gap-2 text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full border text-[11px] font-medium",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-foreground text-foreground",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", i === step && "text-foreground")}>{s}</span>
            </li>
          ))}
        </ol>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-6">
        {step === 0 && (
          <section className="animate-fade-up">
            <h1 className="font-display text-5xl leading-none">Let's get to know you</h1>
            <p className="mt-3 text-muted-foreground">A few basics so your posts start from the right place.</p>
            <div className="surface mt-8 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <div className="space-y-1.5">
                <Label htmlFor="dn">Your name</Label>
                <Input id="dn" className="h-11" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bn">Brand or business name (optional)</Label>
                <Input id="bn" className="h-11" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>What describes you best?</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Usual post language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <Button size="lg" className="mt-6" onClick={next} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null} Continue <ArrowRight />
            </Button>
          </section>
        )}

        {step === 1 && (
          <section className="animate-fade-up">
            <h1 className="font-display text-5xl leading-none">Teach it how you write</h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Paste a few posts you wrote yourself. We'll look at your tone, words, sentence length, emojis and
              formatting, and save it as a reusable style. You can edit it anytime.
            </p>
            <ConfigNotice className="mt-6" />
            <div className="surface mt-6 p-6 sm:p-8">
              <StyleCreateForm
                onCreated={() => finish(true)}
                secondaryAction={
                  <Button variant="ghost" onClick={() => finish(false)} disabled={busy}>
                    Skip — use Natural mode for now
                  </Button>
                }
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade-up text-center sm:pt-10">
            <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-success-soft text-success">
              <Check className="size-6" />
            </span>
            <h1 className="mt-6 font-display text-5xl leading-none">You're all set{displayName ? `, ${displayName.split(" ")[0]}` : ""}</h1>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              {createdStyle
                ? "Your writing style is saved. Create your first post and see how close it gets."
                : "Start with Natural mode. You can add your writing style later from Writing styles."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="brand" onClick={() => navigate({ to: "/create" })}>
                Create my first post <ArrowRight />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
