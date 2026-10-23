import { describe, expect, it } from "vitest";
import { checkLimit, getPlan, usagePeriodStart } from "./plans";

describe("plan entitlements", () => {
  it("free plan allows 20 generations a month", () => {
    expect(getPlan("free").monthlyGenerations).toBe(20);
  });

  it("free plan allows 2 saved writing styles", () => {
    expect(getPlan("free").maxStyleProfiles).toBe(2);
  });

  it("unknown plans fall back to free", () => {
    expect(getPlan("enterprise").id).toBe("free");
    expect(getPlan(null).id).toBe("free");
  });

  it("a canceled pro subscription gets free limits", () => {
    expect(getPlan("pro", "canceled").id).toBe("free");
    expect(getPlan("pro", "active").id).toBe("pro");
  });

  it("blocks usage once the limit is reached", () => {
    expect(checkLimit(20, 19).allowed).toBe(true);
    expect(checkLimit(20, 20).allowed).toBe(false);
    expect(checkLimit(20, 25).remaining).toBe(0);
  });

  it("usage resets on the first day of the month (UTC)", () => {
    expect(usagePeriodStart(new Date("2026-10-23T04:49:00Z")).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});
