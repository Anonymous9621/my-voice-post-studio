import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app/app-shell";
import { PageError, PageSkeleton } from "@/components/app/page";
import { profileQuery } from "@/lib/queries";

// Signed-in app layout with sidebar. Sends new users to onboarding first.
export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (profile && !profile.onboarding_completed) {
      throw redirect({ to: "/onboarding" });
    }
  },
  pendingComponent: PageSkeleton,
  errorComponent: ({ error }) => <PageError error={error} />,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
