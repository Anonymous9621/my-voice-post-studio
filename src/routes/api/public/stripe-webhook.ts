// Stripe webhook. The only code path that writes to `subscriptions`.
// Signature is verified on the raw body before anything touches the database.
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { getStripe, getWebhookSecret, subscriptionPeriodEnd } = await import("@/lib/billing.server");
        const { mapStripeStatus } = await import("@/lib/billing-status");

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const stripe = getStripe();
        const body = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, getWebhookSecret());
        } catch (err) {
          console.error("[stripe-webhook] signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        // Only after verification: privileged client.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const customerIdOf = (c: string | Stripe.Customer | Stripe.DeletedCustomer | null) =>
          typeof c === "string" ? c : (c?.id ?? null);

        async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
          const fromMeta = sub.metadata?.["user_id"];
          if (fromMeta) return fromMeta;
          const customerId = customerIdOf(sub.customer);
          if (!customerId) return null;
          const { data } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id")
            .eq("provider_customer_id", customerId)
            .maybeSingle();
          return data?.user_id ?? null;
        }

        // Idempotent: the same event always produces the same row.
        async function applySubscription(sub: Stripe.Subscription, userId: string, deleted = false) {
          const mapped = deleted ? mapStripeStatus("canceled") : mapStripeStatus(sub.status);
          if (!mapped) return; // e.g. "incomplete": wait for a later event

          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("provider_subscription_id,plan,status")
            .eq("user_id", userId)
            .maybeSingle();

          // A late event for an old subscription must not overwrite a newer, live one.
          if (
            existing?.provider_subscription_id &&
            existing.provider_subscription_id !== sub.id &&
            (existing.plan === "pro" && (existing.status === "active" || existing.status === "trialing"))
          ) {
            console.warn("[stripe-webhook] ignoring event for superseded subscription", sub.id);
            return;
          }

          const { error } = await supabaseAdmin.from("subscriptions").upsert(
            {
              user_id: userId,
              plan: mapped.plan,
              status: mapped.status,
              current_period_end: subscriptionPeriodEnd(sub),
              provider: "stripe",
              provider_customer_id: customerIdOf(sub.customer),
              provider_subscription_id: sub.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (error) throw error;
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              if (session.mode !== "subscription" || !session.subscription) break;
              const userId = session.client_reference_id ?? session.metadata?.["user_id"] ?? null;
              if (!userId) {
                console.error("[stripe-webhook] checkout session without user id", session.id);
                break;
              }
              const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
              const sub = await stripe.subscriptions.retrieve(subId);
              await applySubscription(sub, userId);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = await resolveUserId(sub);
              if (!userId) {
                console.error("[stripe-webhook] no user for subscription", sub.id);
                break;
              }
              await applySubscription(sub, userId, event.type === "customer.subscription.deleted");
              break;
            }
            default:
              break; // acknowledge events we don't handle
          }
        } catch (err) {
          console.error("[stripe-webhook] handler failed", event.type, err);
          // 500 makes Stripe retry; handlers are idempotent so retries are safe.
          return new Response("Webhook handler failed", { status: 500 });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
