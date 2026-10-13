import { describe, expect, test } from "vitest";
import { vendorKey, vendorName } from "./vendors";

describe("vendorName", () => {
  test("drops reference numbers that change from payment to payment", () => {
    expect(vendorName("STRIPE ST-ABC1")).toBe("STRIPE");
    expect(vendorName("STRIPE ST-XYZ2")).toBe("STRIPE");
    expect(vendorName("AWS EMEA 0012345678")).toBe("AWS EMEA");
    expect(vendorName("Check #1024")).toBe("Check");
    expect(vendorName("UBER TRIP 8J2K HELP.UBER.COM")).toBe("UBER TRIP HELP.UBER.COM");
  });

  test("drops dates", () => {
    expect(vendorName("Payroll 09/30")).toBe("Payroll");
    expect(vendorName("Rent 2026-10-01")).toBe("Rent");
  });

  test("keeps names that contain numbers", () => {
    expect(vendorName("7-Eleven")).toBe("7-Eleven");
    expect(vendorName("Office 365")).toBe("Office 365");
    expect(vendorName("Studio 24")).toBe("Studio 24");
    expect(vendorName("1Password")).toBe("1Password");
  });

  test("tidies spaces and leaves plain names alone", () => {
    expect(vendorName("  Google   Workspace ")).toBe("Google Workspace");
    expect(vendorName("Rent")).toBe("Rent");
  });
});

describe("vendorKey", () => {
  test("is the same for one vendor's descriptions, ignoring case", () => {
    expect(vendorKey("Stripe st-abc1")).toBe(vendorKey("STRIPE ST-XYZ2"));
    expect(vendorKey("AWS ")).toBe(vendorKey("aws"));
    expect(vendorKey("Stripe")).not.toBe(vendorKey("Square"));
  });
});
