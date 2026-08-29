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
import { executeLifecycle, applyPipes } from "../src/lifecycle";
import { Controller } from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Param, Query, Body } from "../src/decorators/params";
import { buildRoutes } from "../src/router";
import { buildArguments } from "../src/dispatcher";

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
    [
      {
        index: 0,
        value: { name: "Ada" },
        metadata: { type: "body", name: undefined },
        metatype: Object,
      },
    ],
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

test("applies pipe and restores handler arguments by index", async () => {
  const pipe: Pipe = {
    async transform(value: unknown, argument) {
      if (argument.metadata.type === "body") {
        return { ...(value as Record<string, unknown>), validated: true };
      }
      return value;
    },
  };

  @Controller("users")
  class UsersController {
    @Get(":id")
    method(
      @Query("notify") notify: string,
      unused: unknown,
      @Param("id") id: string,
      @Body() body: object,
    ) {}
  }

  const build = buildRoutes([UsersController]);
  const definitions = await buildArguments(
    build[0],
    { id: "42" },
    { notify: "yes" },
    { name: "Ada" },
  );
  const args = await applyPipes(definitions, pipe);

  assert.deepEqual(args, [
    "yes",
    undefined,
    "42",
    { name: "Ada", validated: true },
  ]);
});
