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
  handleRequest,
  parseRequestUrl,
  readJsonBody,
} from "../src/dispatcher";
import { Readable } from "node:stream";
import { Container } from "../src/container";
import { Injectable } from "../src/decorators/injectable";
import { createServer } from "node:http";
import { RouteDefinition } from "../src/types/routing";
import { CreateUserDto } from "../src/dto/create-user.dto";

test("buildArguments places param query and body values by parameter index", async () => {
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

  assert.deepEqual(args, ["yes", undefined, "42", { name: "Ada" }]);
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

  const result = await dispatchRoute(
    container,
    routeMatch,
    { notify: "yes" },
    { name: "Ada" },
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
        isDto: body instanceof CreateUserDto,
      };
    }
  }

  const container = new Container();
  const routes = buildRoutes([UsersController]);

  const app = await startTestServer(container, routes);
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
      isDto: true,
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

async function startTestServer(
  container: Container,
  routes: RouteDefinition[],
): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = createServer((request, response) => {
    void handleRequest(request, response, container, routes);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  const close = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return { baseUrl, close };
}
