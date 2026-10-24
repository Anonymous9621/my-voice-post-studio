import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Check, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { profileQuery, usageQuery } from "@/lib/queries";
import { BUSINESS_TYPES, OUTPUT_LANGUAGES } from "@/lib/content-options";
import { PLANS } from "@/lib/plans";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSignOut } from "@/components/app/app-shell";
import { useAiConfigured } from "@/components/app/config-notice";
import { PageContainer, PageHeader } from "@/components/app/page";
import { UsageBar } from "@/components/app/usage-meter";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  head: () => pageMeta("Settings", "Manage your profile, plan and usage."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(usageQuery),
    ]),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: usage } = useSuspenseQuery(usageQuery);
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const { configured } = useAiConfigured();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [businessType, setBusinessType] = useState(profile?.business_type ?? "");
  const [language, setLanguage] = useState(profile?.default_language ?? "English");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        business_name: businessName.trim() || null,
        business_type: businessType || null,
        default_language: language,
      })
      .eq("id", user.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) return void toast.error(error.message);
    queryClient.setQueryData(profileQuery.queryKey, data);
    toast.success("Profile saved");
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader eyebrow="Account" title="Settings" />

      <section className="surface p-6">
        <h2 className="font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dn">Your name</Label>
            <Input id="dn" className="h-11" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bn">Brand or business</Label>
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
            <Label>Default post language</Label>
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
        <Button className="mt-5" onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </section>

      <section className="surface mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Plan and usage</h2>
          <span className="text-xs text-muted-foreground">Resets on the 1st of each month</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <UsageBar label="Generations" used={usage.generationsUsed} limit={usage.plan.monthlyGenerations} />
          <UsageBar label="Photo analyses" used={usage.imageAnalysesUsed} limit={usage.plan.monthlyImageAnalyses} />
          <UsageBar label="Writing styles" used={usage.styleCount} limit={usage.plan.maxStyleProfiles} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Object.values(PLANS).map((p) => {
            const current = p.id === usage.plan.id;
            return (
              <div key={p.id} className={cn("rounded-xl border p-4", current && "border-foreground")}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{p.name}</p>
                  {current ? (
                    <Badge variant="success">
                      <Check className="size-3" /> Current
                    </Badge>
                  ) : (
                    <Badge variant="outline">{p.priceLabel}</Badge>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <li>{p.monthlyGenerations} generations / month</li>
                  <li>{p.monthlyImageAnalyses} photo analyses / month</li>
                  <li>{p.maxStyleProfiles} writing styles</li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">AI writing</h2>
          <p className="text-sm text-muted-foreground">
            {configured ? "Connected and ready." : "Requires configuration — the server's AI key is missing."}
          </p>
        </div>
        <Badge variant={configured ? "success" : "warning"}>{configured ? "Active" : "Not configured"}</Badge>
      </section>

      <Button variant="outline" className="mt-6" onClick={signOut}>
        <LogOut /> Sign out
      </Button>
    </PageContainer>
  );
}
