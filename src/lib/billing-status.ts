// Maps a Stripe subscription status onto the values stored in `subscriptions`.
// `getPlan` (plans.ts) only grants Pro for active/trialing, so every other
// status automatically falls back to Free limits.

export type StoredSubscriptionState = {
  plan: "free" | "pro";
  status: "active" | "trialing" | "past_due" | "canceled";
};

/**
 * Returns null for statuses that must not change the stored row
 * (e.g. `incomplete`: the first payment has not succeeded yet).
 */
export function mapStripeStatus(stripeStatus: string): StoredSubscriptionState | null {
  switch (stripeStatus) {
    case "active":
      return { plan: "pro", status: "active" };
    case "trialing":
      return { plan: "pro", status: "trialing" };
    case "past_due":
    case "unpaid":
    case "paused":
      return { plan: "pro", status: "past_due" };
    case "canceled":
    case "incomplete_expired":
      return { plan: "free", status: "canceled" };
    default:
      return null;
  }
}
