// The safety instructions every page sends the browser (next.config.ts)

import { expect, test } from "./test";

test("pages tell the browser not to be framed, to use HTTPS and to keep addresses private", async ({
  request,
}) => {
  for (const path of ["/", "/login", "/dashboard"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["permissions-policy"], path).toContain("camera=()");
  }
});
