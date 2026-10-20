import { describe, expect, test } from "vitest";
import { canAddMember, effectivePlan, statusNote } from "./plans";

describe("effectivePlan", () => {
  test("no subscription: Free", () => {
    expect(effectivePlan(null)).toBe("free");
    expect(effectivePlan(undefined)).toBe("free");
  });

  test("a running subscription counts, also while a failed payment is retried", () => {
    expect(effectivePlan({ plan: "starter", status: "active" })).toBe("starter");
    expect(effectivePlan({ plan: "growth", status: "trialing" })).toBe("growth");
    expect(effectivePlan({ plan: "growth", status: "past_due" })).toBe("growth");
    expect(effectivePlan({ plan: "enterprise", status: "active" })).toBe("enterprise");
  });

  test("cancelled, unpaid or never completed: Free again", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(effectivePlan({ plan: "growth", status })).toBe("free");
    }
  });

  test("a plan we don't know is Free", () => {
    expect(effectivePlan({ plan: "platinum", status: "active" })).toBe("free");
  });
});

describe("canAddMember", () => {
  test("up to the plan's team size", () => {
    expect(canAddMember("free", 1)).toBe(true);
    expect(canAddMember("free", 2)).toBe(false);
    expect(canAddMember("starter", 4)).toBe(true);
    expect(canAddMember("starter", 5)).toBe(false);
    expect(canAddMember("growth", 24)).toBe(true);
    expect(canAddMember("growth", 25)).toBe(false);
  });

  test("Enterprise has no limit", () => {
    expect(canAddMember("enterprise", 10_000)).toBe(true);
  });
});

test("statusNote", () => {
  expect(statusNote("active", false)).toBeNull();
  expect(statusNote("active", true)).toBe("cancelled");
  expect(statusNote("past_due", false)).toBe("pastDue");
  expect(statusNote("canceled", true)).toBeNull();
});
