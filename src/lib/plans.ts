// Plan entitlements. Billing is not implemented yet: every account starts on
// "free" (set by the database on sign-up). When paid billing is added, the
// payment webhook only needs to update the user's row in `subscriptions`.

export type PlanId = "free" | "pro";

/** Usage kinds that count toward the monthly generation allowance. */
export const GENERATION_USAGE_KINDS = ["generation", "regeneration"] as const;

export interface PlanEntitlements {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** Post generations + single-post regenerations per calendar month (UTC). */
  monthlyGenerations: number;
  /** Product photo analyses per calendar month (UTC). */
  monthlyImageAnalyses: number;
  /** Saved writing style profiles at any time. */
  maxStyleProfiles: number;
  available: boolean;
}

export const PLANS: Record<PlanId, PlanEntitlements> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    monthlyGenerations: 20,
    monthlyImageAnalyses: 10,
    maxStyleProfiles: 2,
    available: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "Coming soon",
    monthlyGenerations: 300,
    monthlyImageAnalyses: 150,
    maxStyleProfiles: 20,
    available: false,
  },
};

/** Unknown or missing plans fall back to Free. Inactive paid plans also fall back. */
export function getPlan(planId?: string | null, status?: string | null): PlanEntitlements {
  if (planId === "pro" && (status == null || status === "active" || status === "trialing")) {
    return PLANS.pro;
  }
  return PLANS.free;
}

/** Start of the current usage period: first day of the month, 00:00 UTC. */
export function usagePeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function checkLimit(limit: number, used: number) {
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, remaining, limit, used };
}
