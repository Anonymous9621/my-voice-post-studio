import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { usageQuery } from "@/lib/queries";
import { pageMeta } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/billing-buttons";
import { PageContainer } from "@/components/app/page";

export const Route = createFileRoute("/_authenticated/_app/billing/cancel")({
  head: () => pageMeta("Checkout canceled", "No charge was made."),
  component: BillingCancel,
});

function BillingCancel() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: usageQuery.queryKey });
  }, [queryClient]);

  return (
    <PageContainer className="max-w-xl text-center">
      <div className="surface p-10">
        <h1 className="font-display text-3xl">Checkout canceled</h1>
        <p className="mt-2 text-muted-foreground">No charge was made. You can upgrade whenever you're ready.</p>
        <div className="mt-6 flex justify-center gap-2">
          <UpgradeButton />
          <Button asChild variant="outline">
            <Link to="/settings">Back to settings</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
