import { expect, test } from "vitest";
import { ASSIGNABLE_ROLES, can, isRole, ROLES, type Permission } from "./roles";

test("what each role may do", () => {
  const permissions: Permission[] = [
    "finance.record",
    "finance.manage",
    "activity.view",
    "team.manage",
    "company.update",
  ];
  const allowed = Object.fromEntries(
    ROLES.map((role) => [role, permissions.filter((p) => can(role, p))]),
  );
  expect(allowed).toEqual({
    owner: ["finance.record", "finance.manage", "activity.view", "team.manage", "company.update"],
    admin: ["finance.record", "finance.manage", "activity.view", "team.manage", "company.update"],
    accountant: ["finance.record", "finance.manage", "activity.view"],
    member: ["finance.record"],
    viewer: [],
  });
});

test("unknown roles may do nothing", () => {
  expect(can("superuser", "finance.record")).toBe(false);
  expect(can("toString", "finance.record")).toBe(false);
  expect(isRole("accountant")).toBe(true);
  expect(isRole("constructor")).toBe(false);
});

test("nobody can be invited as or made the owner", () => {
  expect(ASSIGNABLE_ROLES).toEqual(["admin", "accountant", "member", "viewer"]);
});
