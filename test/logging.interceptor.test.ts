import assert from "node:assert/strict";
import { test } from "node:test";

import type { HttpContext } from "../src/types/lifecycle";
import { LoggingInterceptor } from "../src/interceptors/logging.interceptor";

test("LoggingInterceptor logs method path and duration", async () => {
  const messages: string[] = [];

  const interceptor = new LoggingInterceptor((message: string) => {
    messages.push(message);
  });

  const context = {
    request: {
      method: "GET",
      url: "/users/42?limit=5",
    },
    response: {},
  } as unknown as HttpContext;

  const result = await interceptor.intercept(context, async () => ({
    ok: true,
  }));

  assert.deepEqual(result, { ok: true });
  assert.equal(messages.length, 1);
  assert.match(messages[0], /^GET \/users\/42 — [0-9]+(\.[0-9]+)? ms$/);
});
