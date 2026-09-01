import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Controller } from "../src/decorators/controller";
import { Get, Post } from "../src/decorators/methods";
import { Param, Query, Body } from "../src/decorators/params";
import { buildRoutes, matchRoute } from "../src/router";
import {
  buildArguments,
  dispatchRoute,
  parseRequestUrl,
  readJsonBody,
} from "../src/dispatcher";
import { Readable } from "node:stream";
import { Container } from "../src/container";
import { Injectable } from "../src/decorators/injectable";
import {
  CreateUserSchema,
  type CreateUserDto,
} from "../src/dto/create-user.dto";
import type { HttpContext, LifecycleConfig } from "../src/types/lifecycle";
import { DEFAULT_LIFECYCLE_CONFIG } from "../src/lifecycle";
import { ZodValidationPipe } from "../src/pipes/zod-validation.pipe";
import { AuthGuard } from "../src/guards/auth.guard";
import { NotFoundError } from "../src/errors";
import { startTestServer } from "./helpers";

test("buildArguments describes raw handler arguments by parameter index", async () => {
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
  const args = await buildArguments(
    build[0],
    { id: "42" },
    { notify: "yes" },
    { name: "Ada" },
  );

  assert.deepEqual(args, [
    {
      index: 0,
      value: "yes",
      metadata: { type: "query", name: "notify" },
      metatype: String,
    },
    {
      index: 2,
      value: "42",
      metadata: { type: "param", name: "id" },
      metatype: String,
    },
    {
      index: 3,
      value: { name: "Ada" },
      metadata: { type: "body", name: undefined },
      metatype: Object,
    },
  ]);
});

test("parseRequestUrl separates pathname and query parameters", () => {
  const res = parseRequestUrl("/users/42?notify=yes&limit=5");

  assert.deepEqual(res, {
    pathname: "/users/42",
    query: { notify: "yes", limit: "5" },
  });
});

test("parseRequestUrl uses root path when request URL is missing", () => {
  const res = parseRequestUrl(undefined);

  assert.deepEqual(res, {
    pathname: "/",
    query: {},
  });
});

test("readJsonBody collects multiple chunks and parses JSON", async () => {
  const stream = Readable.from(['{"name":', '"Ada"}']);
  const body = await readJsonBody(stream);

  assert.deepEqual(body, { name: "Ada" });
});

test("readJsonBody returns undefined for an empty stream", async () => {
  const stream = Readable.from([]);
  const body = await readJsonBody(stream);

  assert.deepEqual(body, undefined);
});

test("readJsonBody rejects malformed JSON", async () => {
  const stream = Readable.from(['{"name":"Ada"']);
  await assert.rejects(() => readJsonBody(stream), SyntaxError);
});

test("dispatchRoute resolves controller through container and invokes handler with built arguments", async () => {
  let serviceReceivedByController: UserService | undefined;

  @Injectable()
  class UserService {}

  @Controller("users")
  class UsersController {
    constructor(public readonly userService: UserService) {}

    @Post(":id")
    method(
      @Query("notify") notify: string,
      unused: unknown,
      @Param("id") id: string,
      @Body() body: object,
    ) {
      serviceReceivedByController = this.userService;

      return {
        notify,
        unused,
        id,
        body,
      };
    }
  }

  const container = new Container();

  const routes = buildRoutes([UsersController]);

  const routeMatch = matchRoute(routes, "POST", "/users/42");
  assert.ok(routeMatch);

  const context = {} as HttpContext;

  const result = await dispatchRoute(
    container,
    routeMatch,
    { notify: "yes" },
    { name: "Ada" },
    context,
    DEFAULT_LIFECYCLE_CONFIG,
  );

  assert.deepEqual(result, {
    notify: "yes",
    unused: undefined,
    id: "42",
    body: { name: "Ada" },
  });

  const expectedService = container.resolve(UserService);

  assert.equal(serviceReceivedByController, expectedService);
});

test("handleRequest injects GET path and query parameters into handler arguments", async () => {
  @Controller("users")
  class UsersController {
    @Get(":id")
    find(@Param("id") id: string, @Query("limit") limit: string) {
      return { id, limit };
    }
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);

  const app = await startTestServer(container, routes);

  try {
    const response = await fetch(`${app.baseUrl}/users/42?limit=5`);
    assert.equal(response.status, 200);

    const responseBody = await response.json();

    assert.deepEqual(responseBody, {
      id: "42",
      limit: "5",
    });
  } finally {
    await app.close();
  }
});

test("handleRequest transforms valid DTOs and rejects invalid DTOs", async () => {
  @Controller("users")
  class UsersController {
    @Post(":id")
    method(
      @Query("notify") notify: string,
      unused: unknown,
      @Param("id") id: string,
      @Body() body: CreateUserDto,
    ) {
      return {
        notify,
        unused,
        id,
        body,
      };
    }
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);
  const lifecycleConfig: LifecycleConfig = {
    ...DEFAULT_LIFECYCLE_CONFIG,
    pipe: new ZodValidationPipe(CreateUserSchema),
  };

  const app = await startTestServer(container, routes, lifecycleConfig);

  try {
    const response = await fetch(`${app.baseUrl}/users/42?notify=yes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Ada",
        email: "ada@example.com",
        age: 20,
      }),
    });

    assert.equal(response.status, 201);
    assert.match(
      response.headers.get("content-type") ?? "",
      /application\/json/,
    );

    const responseBody = await response.json();

    assert.deepEqual(responseBody, {
      notify: "yes",
      id: "42",
      body: {
        name: "Ada",
        email: "ada@example.com",
        age: 20,
      },
    });

    const invalidResponse = await fetch(`${app.baseUrl}/users/42?notify=yes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Ada",
        email: "not-an-email",
        age: 20,
      }),
    });
    assert.equal(invalidResponse.status, 400);

    const invalidResponseBody = await invalidResponse.json();
    assert.match(JSON.stringify(invalidResponseBody), /email/);
  } finally {
    await app.close();
  }
});

test("handleRequest returns 403 and skips handler when guard denies access", async () => {
  let handlerCalls = 0;

  @Controller("")
  class UsersController {
    @Get("")
    method() {
      handlerCalls++;
    }
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);
  const lifecycleConfig: LifecycleConfig = {
    ...DEFAULT_LIFECYCLE_CONFIG,
    guard: new AuthGuard(),
  };

  const app = await startTestServer(container, routes, lifecycleConfig);

  try {
    const response = await fetch(`${app.baseUrl}`, {
      method: "GET",
      headers: {},
    });

    assert.equal(response.status, 403);
    assert.equal(handlerCalls, 0);
  } finally {
    await app.close();
  }
});

test("exception filter maps domain errors and hides unexpected details", async () => {
  @Controller("")
  class UsersController {
    @Get("/missing")
    missing() {
      throw new NotFoundError("User 42 not found");
    }

    @Get("/boom")
    boom() {
      throw new Error("boom secret");
    }

    @Get("/interceptor-error")
    interceptorError() {}
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);
  const lifecycleConfig: LifecycleConfig = {
    ...DEFAULT_LIFECYCLE_CONFIG,
    interceptor: {
      intercept(
        context: HttpContext,
        next: () => Promise<unknown>,
      ): Promise<unknown> {
        if (context.request.url === "/interceptor-error") {
          throw new Error("Interceptor secret");
        }
        return next();
      },
    },
  };

  const app = await startTestServer(container, routes, lifecycleConfig);

  try {
    const missingResponse = await fetch(`${app.baseUrl}/missing`, {
      method: "GET",
    });
    assert.equal(missingResponse.status, 404);
    const missingBody = await missingResponse.text();
    assert.match(missingBody, /User 42 not found/);

    const boomResponse = await fetch(`${app.baseUrl}/boom`, {
      method: "GET",
    });
    assert.equal(boomResponse.status, 500);
    const unexpectedBody = await boomResponse.text();
    assert.doesNotMatch(unexpectedBody, /boom|secret|at .*\.ts:/);

    const interceptorResponse = await fetch(
      `${app.baseUrl}/interceptor-error`,
      {
        method: "GET",
      },
    );
    assert.equal(interceptorResponse.status, 500);
    const interceptorBody = await interceptorResponse.text();
    assert.doesNotMatch(interceptorBody, /interceptor secret/i);
  } finally {
    await app.close();
  }
});
