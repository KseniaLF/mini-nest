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

test("buildArguments places param query and body values by parameter index", () => {
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
  const args = buildArguments(
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
