import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Inject } from "../src/decorators/inject";
import { Injectable } from "../src/decorators/injectable";
import { INJECT_TOKENS_METADATA } from "../src/tokens";

test("Inject stores a token for the constructor parameter index", () => {
  const CONFIG = Symbol.for("CONFIG");

  @Injectable()
  class Service {
    constructor(_withoutInject: object, @Inject(CONFIG) _config: object) {}
  }

  const metadata = Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, Service);

  assert.ok(metadata instanceof Map);
  assert.equal(metadata.get(1), CONFIG);
  assert.equal(metadata.has(0), false);
});
