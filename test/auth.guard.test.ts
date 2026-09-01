import assert from "node:assert/strict";
import { test } from "node:test";

import type { HttpContext } from "../src/types/lifecycle";
import { AuthGuard } from "../src/guards/auth.guard";

test("AuthGuard allows requests with Authorization and blocks requests without it", () => {
  const guard = new AuthGuard();

  const withAuthorization = {
    request: {
      headers: {
        authorization: "Bearer token",
      },
    },
    response: {},
  } as unknown as HttpContext;

  const withoutAuthorization = {
    request: {
      headers: {},
    },
    response: {},
  } as unknown as HttpContext;

  assert.equal(guard.canActivate(withAuthorization), true);
  assert.equal(guard.canActivate(withoutAuthorization), false);
});
