import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

import { Injectable } from "../src/decorators/injectable";
import { Container } from "../src/container";

test("resolves an injectable class without dependencies", () => {
  @Injectable()
  class Service {}

  const container = new Container();
  const instance = container.resolve(Service);

  assert.ok(instance instanceof Service);
});

test("throws for a class without @Injectable", () => {
  class NotInjectable {}

  const container = new Container();

  assert.throws(() => container.resolve(NotInjectable), /NotInjectable/);
});

test("resolves a recursive dependency graph", () => {
  @Injectable()
  class C {}

  @Injectable()
  class B {
    constructor(public c: C) {}
  }

  @Injectable()
  class A {
    constructor(public b: B) {}
  }

  const container = new Container();
  const result = container.resolve(A);

  assert.ok(result instanceof A);
  assert.ok(result.b instanceof B);
  assert.ok(result.b.c instanceof C);
});

test("returns the same instance for singleton scope", () => {
  @Injectable()
  class SingletonService {}

  const container = new Container();

  const first = container.resolve(SingletonService);
  const second = container.resolve(SingletonService);

  assert.equal(first, second);
});

test("returns different instances for transient scope", () => {
  @Injectable({ scope: "transient" })
  class TransientService {}

  const container = new Container();

  const first = container.resolve(TransientService);
  const second = container.resolve(TransientService);

  assert.notEqual(first, second);
});
