import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";

import { usageQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/_app/billing/success")({
  head: () => pageMeta("Welcome to Pro", "Your subscription is being activated."),
  component: BillingSuccess,
});

const MAX_CHECKS = 10;

function BillingSuccess() {
  const queryClient = useQueryClient();
  const { data: usage } = useQuery(usageQuery);
  const isPro = usage?.plan.id === "pro";

  // The webhook can land a moment after the redirect, so re-check usage briefly.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: usageQuery.queryKey });
    if (isPro) return;
    let checks = 0;
    const t = setInterval(() => {
      checks += 1;
      queryClient.invalidateQueries({ queryKey: usageQuery.queryKey });
      if (checks >= MAX_CHECKS) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }, [isPro, queryClient]);

  return (
    <PageContainer className="max-w-xl text-center">
      <div className="surface p-10">
        {isPro ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h1 className="mt-4 font-display text-3xl">You're on Pro</h1>
            <p className="mt-2 text-muted-foreground">
              Thanks for subscribing. You now have {usage!.plan.monthlyGenerations} generations,{" "}
              {usage!.plan.monthlyImageAnalyses} photo analyses and {usage!.plan.maxStyleProfiles} writing styles
              each month.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" />
            <h1 className="mt-4 font-display text-3xl">Activating your plan…</h1>
            <p className="mt-2 text-muted-foreground">
              Payment received. This usually takes a few seconds. If your plan doesn't update, refresh in a minute.
            </p>
          </>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="brand">
            <Link to="/create">Create a post</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">Go to settings</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
