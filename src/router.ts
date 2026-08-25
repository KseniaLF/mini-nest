import {
  Constructor,
  CONTROLLER_PREFIX_METADATA,
  ROUTE_METADATA,
} from "./tokens";
import { RouteDefinition, RouteMetadata } from "./types/routing";
import { posix } from "node:path";

export function buildRoutes(controllers: Constructor[]): RouteDefinition[] {
  const res: RouteDefinition[] = [];

  for (const Controller of controllers) {
    const controllerPrefix = Reflect.getOwnMetadata(
      CONTROLLER_PREFIX_METADATA,
      Controller,
    ) as string | undefined;

    if (controllerPrefix === undefined) {
      throw new Error(`${Controller.name} is not decorated with @Controller()`);
    }

    const prototype = Controller.prototype;

    const methodsNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== "constructor",
    );

    for (const name of methodsNames) {
      const routeMetadata = Reflect.getOwnMetadata(
        ROUTE_METADATA,
        prototype,
        name,
      ) as RouteMetadata | undefined;

      if (routeMetadata === undefined) continue;

      const fullPath = posix.join("/", controllerPrefix, routeMetadata.path);

      res.push({
        method: routeMetadata.method,
        path: fullPath,
        controllerToken: Controller,
        handlerKey: name,
      });
    }
  }

  return res;
}
