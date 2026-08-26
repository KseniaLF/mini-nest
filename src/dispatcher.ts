import { ParamMetadata } from "./decorators/params";
import { PARAM_METADATA } from "./tokens";
import { RouteDefinition } from "./types/routing";

export function buildArguments(
  route: RouteDefinition,
  params: Record<string, string>,
  query: Record<string, string>,
  body: unknown,
): unknown[] {
  const args: unknown[] = [];

  const prototype = route.controllerToken.prototype;
  const handlerKey = route.handlerKey;

  const paramsMetadata = Reflect.getOwnMetadata(
    PARAM_METADATA,
    prototype,
    handlerKey,
  ) as Map<number, ParamMetadata> | undefined;

  if (paramsMetadata === undefined) return [];

  for (const [parameterIndex, metadata] of paramsMetadata) {
    if (metadata.type === "body") {
      args[parameterIndex] = body;
      continue;
    }

    if (metadata.name === undefined) continue;

    if (metadata.type === "param") {
      args[parameterIndex] = params[metadata.name];
    }

    if (metadata.type === "query") {
      args[parameterIndex] = query[metadata.name];
    }
  }

  return [...args];
}

export function parseRequestUrl(url: string | undefined) {}
