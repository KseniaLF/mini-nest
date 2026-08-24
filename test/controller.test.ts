import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { CONTROLLER_PREFIX_METADATA, INJECTABLE_METADATA } from "../src/tokens";
import { Controller } from "../src/decorators/controller";

test("Controller stores prefix and marks class as injectable", () => {
  @Controller("users")
  class UsersController {}

  const users = Reflect.getOwnMetadata(
    CONTROLLER_PREFIX_METADATA,
    UsersController,
  );
  assert.equal(users, "users");

  const injectable = Reflect.getOwnMetadata(
    INJECTABLE_METADATA,
    UsersController,
  );
  assert.equal(injectable, true);
});
