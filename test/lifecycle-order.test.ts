import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  Guard,
  HttpContext,
  Interceptor,
  LifecycleConfig,
  Middleware,
  Pipe,
} from "../src/types/lifecycle";
import { executeLifecycle } from "../src/lifecycle";

test("executes request lifecycle stages in the correct order", async () => {
  const calls: string[] = [];

  const guard: Guard = {
    canActivate(_context) {
      calls.push("guard");
      return true;
    },
  };

  const pipe: Pipe = {
    transform(value: unknown) {
      calls.push("pipe");
      return value;
    },
  };

  const interceptor: Interceptor = {
    async intercept(_context, next) {
      calls.push("interceptor:before");

      const result = await next();

      calls.push("interceptor:after");

      return result;
    },
  };

  const middleware: Middleware = {
    async use(_context, next) {
      calls.push("middleware");
      return next();
    },
  };

  async function handler(data: unknown) {
    calls.push("handler");
    return data;
  }

  const lifecycleConfig: LifecycleConfig = {
    middleware,
    guard,
    pipe,
    interceptor,
  };

  const context = {} as HttpContext;

  await executeLifecycle(
    lifecycleConfig,
    context,
    { message: "hello" },
    handler,
  );

  assert.deepEqual(calls, [
    "middleware",
    "guard",
    "interceptor:before",
    "pipe",
    "handler",
    "interceptor:after",
  ]);
});
