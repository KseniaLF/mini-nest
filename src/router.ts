import {
  Constructor,
  CONTROLLER_PREFIX_METADATA,
  ROUTE_METADATA,
} from "./tokens";
import {
  HttpMethod,
  RouteDefinition,
  RouteMatch,
  RouteMetadata,
} from "./types/routing";
import { posix } from "node:path";

export function buildRoutes(controllers: Constructor[]): RouteDefinition[] {
  const res: RouteDefinition[] = [];

  for (const Controller of controllers) {
    const controllerPrefix = Reflect.getMetadata(
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
      const routeMetadata = Reflect.getMetadata(
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

export function matchRoute(
  routeDefinition: RouteDefinition[],
  method: HttpMethod,
  path: string,
): RouteMatch | undefined {
  for (const route of routeDefinition) {
    if (route.method !== method) continue;

    const params = matchPath(route.path, path);

    if (params === undefined) continue;

    return {
      route,
      params,
    };
  }
  return undefined;
}

function matchPath(
  template: string,
  pathname: string,
): Record<string, string> | undefined {
  const templateSegments = template.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (templateSegments.length !== pathSegments.length) return undefined;

  const params: Record<string, string> = {};

  for (let index = 0; index < templateSegments.length; index++) {
    const templateSegment = templateSegments[index];
    const pathSegment = pathSegments[index];

    if (templateSegment.startsWith(":")) {
      const paramName = templateSegment.slice(1);

      params[paramName] = pathSegment;
    } else if (templateSegment !== pathSegment) {
      return undefined;
    }
  }

  return params;
}
