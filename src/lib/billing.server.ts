// Server-only Stripe helpers. Never import this from route components.
import Stripe from "stripe";

export class BillingConfigError extends Error {}

export function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new BillingConfigError("STRIPE_SECRET_KEY is not set");
  // Workers have no Node http module, so use the fetch-based client.
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

/** The only prices a client may ever buy. Chosen on the server, never by the browser. */
export function getProMonthlyPriceId(): string {
  const id = process.env["STRIPE_PRICE_PRO_MONTHLY"];
  if (!id) throw new BillingConfigError("STRIPE_PRICE_PRO_MONTHLY is not set");
  return id;
}

export function getWebhookSecret(): string {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new BillingConfigError("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}

/** Public origin used for Stripe return URLs. Prefer APP_URL; fall back to the request origin. */
export function resolveAppUrl(request: Request | undefined): string {
  const configured = process.env["APP_URL"];
  if (configured) return configured.replace(/\/+$/, "");
  if (!request) throw new BillingConfigError("APP_URL is not set");
  return new URL(request.url).origin;
}

/** Billing period end. Newer Stripe API versions moved it from the subscription to its items. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const seconds = fromItem ?? legacy;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}
