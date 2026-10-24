// Billing server functions. Each one requires a signed-in user.
// Only the Stripe webhook ever writes to `subscriptions`.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { BillingConfigError, getProMonthlyPriceId, getStripe, resolveAppUrl } from "./billing.server";
import type { ActionResult } from "./content-types";
import { getPlan } from "./plans";

function fail(error: unknown): { ok: false; error: string; code: string } {
  if (error instanceof BillingConfigError) {
    console.error("[billing] misconfigured:", error.message);
    return { ok: false, error: "Billing isn't configured yet. Please contact support.", code: "not_configured" };
  }
  console.error("[billing]", error);
  return { ok: false, error: "Something went wrong with billing. Please try again.", code: "unknown" };
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActionResult<{ url: string }>> => {
    try {
      const { supabase, userId, claims } = context;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan,status,provider_customer_id")
        .maybeSingle();

      if (getPlan(sub?.plan, sub?.status).id === "pro") {
        return { ok: false, error: "You're already on Pro. Use Manage subscription instead.", code: "already_subscribed" };
      }

      const stripe = getStripe();
      const appUrl = resolveAppUrl(getRequest());
      const customerId = sub?.provider_customer_id ?? null;
      const email = typeof claims.email === "string" ? claims.email : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: userId,
        metadata: { user_id: userId },
        subscription_data: { metadata: { user_id: userId } },
        line_items: [{ price: getProMonthlyPriceId(), quantity: 1 }],
        ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
        ...(process.env["STRIPE_AUTOMATIC_TAX"] === "true" ? { automatic_tax: { enabled: true } } : {}),
        allow_promotion_codes: true,
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/billing/cancel`,
      });

      if (!session.url) return { ok: false, error: "Couldn't start checkout. Please try again.", code: "no_url" };
      return { ok: true, data: { url: session.url } };
    } catch (e) {
      return fail(e);
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActionResult<{ url: string }>> => {
    try {
      const { data: sub } = await context.supabase
        .from("subscriptions")
        .select("provider_customer_id")
        .maybeSingle();

      if (!sub?.provider_customer_id) {
        return { ok: false, error: "No billing account found for this user.", code: "no_customer" };
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: sub.provider_customer_id,
        return_url: `${resolveAppUrl(getRequest())}/settings`,
      });
      return { ok: true, data: { url: session.url } };
    } catch (e) {
      return fail(e);
    }
  });
