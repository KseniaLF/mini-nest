import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Controller } from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Param } from "../src/decorators/params";
import { buildRoutes } from "../src/router";
import { Container } from "../src/container";
import { DEFAULT_LIFECYCLE_CONFIG } from "../src/lifecycle";
import type { LifecycleConfig } from "../src/types/lifecycle";
import {
  RequestContext,
  requestContextMiddleware,
} from "../src/context/request-context";
import { startTestServer } from "./helpers";

test("keeps request IDs isolated across parallel requests", async () => {
  @Controller("context")
  class UsersController {
    @Get(":index")
    async handler(@Param("index") index: string) {
      const res = await firstLevel(index);
      return { requestId: res };
    }
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);
  const lifecycleConfig: LifecycleConfig = {
    ...DEFAULT_LIFECYCLE_CONFIG,
    middleware: requestContextMiddleware,
  };
  const app = await startTestServer(container, routes, lifecycleConfig);

  try {
    const requestIds = Array.from({ length: 10 }, (_, index) => `REQ-${index}`);

    const results = await Promise.all(
      requestIds.map(async (sentId, index) => {
        const response = await fetch(`${app.baseUrl}/context/${index}`, {
          headers: {
            "X-Request-Id": sentId,
          },
        });

        const body = (await response.json()) as { requestId: string };

        return {
          sentId,
          headerId: response.headers.get("x-request-id"),
          bodyId: body.requestId,
        };
      }),
    );

    results.forEach((res) => {
      assert.equal(res.headerId, res.sentId);
      assert.equal(res.bodyId, res.sentId);
    });
  } finally {
    await app.close();
  }
});

async function firstLevel(index: string) {
  const delayMs = (9 - +index) * 5;
  return secondLevel(delayMs);
}

async function secondLevel(delayTime: number) {
  await sleep(delayTime);
  return RequestContext.requestId;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
