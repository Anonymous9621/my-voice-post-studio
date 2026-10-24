import { useState, type ComponentProps } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createCheckoutSession, createPortalSession } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";

type ButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "asChild">;

/** Starts Stripe Checkout for the Pro plan and redirects the browser to it. */
export function UpgradeButton({ children, variant = "brand", ...props }: ButtonProps) {
  const checkout = useServerFn(createCheckoutSession);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await checkout();
      if (!res.ok) {
        toast.error(res.error);
        setBusy(false);
        return;
      }
      window.location.href = res.data.url;
    } catch {
      toast.error("Couldn't start checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={go} disabled={busy || props.disabled} {...props}>
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {children ?? "Upgrade to Pro"}
    </Button>
  );
}

/** Opens the Stripe Customer Portal (cancel, change card, invoices). */
export function ManageSubscriptionButton({ children, variant = "outline", ...props }: ButtonProps) {
  const portal = useServerFn(createPortalSession);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await portal();
      if (!res.ok) {
        toast.error(res.error);
        setBusy(false);
        return;
      }
      window.location.href = res.data.url;
    } catch {
      toast.error("Couldn't open the billing portal. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={go} disabled={busy || props.disabled} {...props}>
      {busy && <Loader2 className="animate-spin" />}
      {children ?? "Manage subscription"}
    </Button>
  );
}
