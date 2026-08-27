import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { PARAM_METADATA } from "../src/tokens";
import { Body, Param, Query } from "../src/decorators/params";

test("parameter decorators store source and name by parameter index", () => {
  class UsersController {
    findOne(
      @Query("notify") notify: string,
      @Body() body: object,
      @Param("id") id: string,
    ) {}
  }

  const metadata = Reflect.getOwnMetadata(
    PARAM_METADATA,
    UsersController.prototype,
    "findOne",
  );

  assert.ok(metadata instanceof Map);
  assert.equal(metadata.size, 3);
  assert.deepEqual(metadata.get(0), { type: "query", name: "notify" });
  assert.deepEqual(metadata.get(1), { type: "body", name: undefined });
  assert.deepEqual(metadata.get(2), { type: "param", name: "id" });
});
