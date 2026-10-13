import { describe, expect, test } from "vitest";
import { readUnsubscribeLink, unsubscribeLinks } from "./unsubscribe";

const target = {
  userId: "user_1",
  organizationId: "org_1",
  kind: "weeklyDigest",
} as const;

// A link's query, as the page or the route reads it from the address
const queryOf = (url: string) => Object.fromEntries(new URL(url).searchParams);

describe("unsubscribe links", () => {
  test("a link says what it stops, and reads back as that", () => {
    const links = unsubscribeLinks(target, "secret")!;
    expect(links.pageUrl).toContain("/unsubscribe?u=user_1&o=org_1&k=weeklyDigest&t=");
    expect(links.postUrl).toContain("/api/email/unsubscribe?u=user_1");
    expect(readUnsubscribeLink(queryOf(links.pageUrl), "secret")).toEqual(target);
    expect(readUnsubscribeLink(queryOf(links.postUrl), "secret")).toEqual(target);
  });

  test("a link that was changed is refused", () => {
    const query = queryOf(unsubscribeLinks(target, "secret")!.pageUrl);
    // Someone else's emails, another company's, another kind
    expect(readUnsubscribeLink({ ...query, u: "user_2" }, "secret")).toBeNull();
    expect(readUnsubscribeLink({ ...query, o: "org_2" }, "secret")).toBeNull();
    expect(readUnsubscribeLink({ ...query, k: "unusualCharges" }, "secret")).toBeNull();
    expect(readUnsubscribeLink({ ...query, k: "everything" }, "secret")).toBeNull();
    expect(readUnsubscribeLink({ ...query, t: "" }, "secret")).toBeNull();
    expect(readUnsubscribeLink({ ...query, t: `${query.t}x` }, "secret")).toBeNull();
    // Signed with another secret
    expect(readUnsubscribeLink(query, "other")).toBeNull();
    expect(readUnsubscribeLink({}, "secret")).toBeNull();
  });

  test("without a secret there are no links, and none are accepted", () => {
    expect(unsubscribeLinks(target, "")).toBeNull();
    const query = queryOf(unsubscribeLinks(target, "secret")!.pageUrl);
    expect(readUnsubscribeLink(query, "")).toBeNull();
  });
});
