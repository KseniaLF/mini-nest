import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Controller } from "../src/decorators/controller";
import { Get } from "../src/decorators/methods";
import { Param, Query, Body } from "../src/decorators/params";
import { buildRoutes } from "../src/router";
import { buildArguments } from "../src/dispatcher";

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
