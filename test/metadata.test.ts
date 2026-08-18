import "reflect-metadata";

import assert from "node:assert/strict";
import { test } from "node:test";

const Injectable = (): ClassDecorator => () => {};

class Logger {}

@Injectable()
class Service {
  constructor(_logger: Logger) {}
}

test("TypeScript emits constructor parameter metadata", () => {
  const dependencies = Reflect.getMetadata("design:paramtypes", Service) as
    | Function[]
    | undefined;

  assert.ok(dependencies);
  assert.equal(dependencies[0], Logger);
});
