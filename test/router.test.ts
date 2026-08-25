import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Controller } from "../src/decorators/controller";
import { buildRoutes } from "../src/router";
import { Get, Post } from "../src/decorators/methods";

test("buildRoutes collects route definitions from controller metadata", () => {
  @Controller("users")
  class UsersController {
    @Get(":id")
    findOne() {}

    @Post("")
    create() {}

    smth() {}
  }

  @Controller("admins")
  class AdminsController {
    @Get(":id")
    findOne() {}
  }

  const res = buildRoutes([UsersController, AdminsController]);

  assert.deepEqual(res, [
    {
      method: "GET",
      path: "/users/:id",
      controllerToken: UsersController,
      handlerKey: "findOne",
    },
    {
      method: "POST",
      path: "/users",
      controllerToken: UsersController,
      handlerKey: "create",
    },
    {
      method: "GET",
      path: "/admins/:id",
      controllerToken: AdminsController,
      handlerKey: "findOne",
    },
  ]);
});

test("buildRoutes throws when a class is not decorated with Controller", () => {
  class UsersController {
    @Get(":id")
    findOne() {}
  }

  assert.throws(
    () => buildRoutes([UsersController]),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /UsersController is not decorated with @Controller\(\)/,
      );

      return true;
    },
  );
});
