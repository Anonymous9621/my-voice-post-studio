import { describe, expect, it } from "vitest";
import { mapStripeStatus } from "./billing-status";
import { getPlan } from "./plans";

function planFor(stripeStatus: string) {
  const m = mapStripeStatus(stripeStatus);
  return m ? getPlan(m.plan, m.status).id : null;
}

describe("Stripe status mapping", () => {
  it("active and trialing grant Pro", () => {
    expect(mapStripeStatus("active")).toEqual({ plan: "pro", status: "active" });
    expect(planFor("trialing")).toBe("pro");
  });

  it("failed payments fall back to Free limits", () => {
    expect(mapStripeStatus("past_due")?.status).toBe("past_due");
    expect(planFor("past_due")).toBe("free");
    expect(planFor("unpaid")).toBe("free");
  });

  it("canceled subscriptions return to Free", () => {
    expect(mapStripeStatus("canceled")).toEqual({ plan: "free", status: "canceled" });
    expect(planFor("incomplete_expired")).toBe("free");
  });

  it("incomplete leaves the stored row untouched", () => {
    expect(mapStripeStatus("incomplete")).toBeNull();
    expect(mapStripeStatus("something_new")).toBeNull();
  });

  it("pro limits are 300 / 150 / 20", () => {
    const pro = getPlan("pro", "active");
    expect([pro.monthlyGenerations, pro.monthlyImageAnalyses, pro.maxStyleProfiles]).toEqual([300, 150, 20]);
  });
});
