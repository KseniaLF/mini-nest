import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Injectable } from "../src/decorators/injectable";
import { INJECTABLE_METADATA, SCOPE_METADATA } from "../src/tokens";

test("Injectable marks a class and uses singleton scope by default", () => {
  @Injectable()
  class Service {}

  const injectable = Reflect.getMetadata(INJECTABLE_METADATA, Service);
  assert.equal(injectable, true);

  const scope = Reflect.getMetadata(SCOPE_METADATA, Service);
  const expectedValue = "singleton";

  assert.equal(scope, expectedValue);
});

test("Injectable stores transient scope", () => {
  @Injectable({ scope: "transient" })
  class TransientService {}

  const scope = Reflect.getMetadata(SCOPE_METADATA, TransientService);
  const expectedValue = "transient";

  assert.equal(scope, expectedValue);
});
