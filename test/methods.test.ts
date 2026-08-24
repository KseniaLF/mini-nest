import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { ROUTE_METADATA } from "../src/tokens";
import { Get, Post } from "../src/decorators/methods";

test("Get and Post store HTTP method and path metadata", () => {
  class UsersController {
    @Get(":id")
    findOne() {}

    @Post("")
    create() {}
  }

  const metadataGET = Reflect.getOwnMetadata(
    ROUTE_METADATA,
    UsersController.prototype,
    "findOne",
  );
  assert.deepEqual(metadataGET, { method: "GET", path: ":id" });

  const metadataPOST = Reflect.getOwnMetadata(
    ROUTE_METADATA,
    UsersController.prototype,
    "create",
  );
  assert.deepEqual(metadataPOST, { method: "POST", path: "" });
});
