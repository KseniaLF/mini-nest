import { Readable } from "node:stream";
import { ParamMetadata } from "./decorators/params";
import { Constructor, PARAM_METADATA } from "./tokens";
import { ParsedRequestUrl, RouteDefinition, RouteMatch } from "./types/routing";
import { Container } from "./container";
import { IncomingMessage, ServerResponse } from "node:http";
import { matchRoute } from "./router";
import { DtoValidationError, ValidationPipe } from "./pipes/validation.pipe";

const validationPipe = new ValidationPipe();

const BUILTIN_TYPES: Constructor[] = [String, Number, Boolean, Array, Object];

export async function buildArguments(
  route: RouteDefinition,
  params: Record<string, string>,
  query: Record<string, string>,
  body: unknown,
): Promise<unknown[]> {
  const args: unknown[] = [];

  const prototype = route.controllerToken.prototype;
  const handlerKey = route.handlerKey;

  const paramsMetadata = Reflect.getOwnMetadata(
    PARAM_METADATA,
    prototype,
    handlerKey,
  ) as Map<number, ParamMetadata> | undefined;

  if (paramsMetadata === undefined) return [];

  const parameterTypes = Reflect.getMetadata(
    "design:paramtypes",
    prototype,
    handlerKey,
  ) as Constructor[] | undefined;

  for (const [parameterIndex, metadata] of paramsMetadata) {
    if (metadata.type === "body") {
      const metatype = parameterTypes?.[parameterIndex];
      if (metatype && !BUILTIN_TYPES.includes(metatype)) {
        args[parameterIndex] = await validationPipe.transform(body, metatype);
      } else {
        args[parameterIndex] = body;
      }

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

export function parseRequestUrl(
  requestUrl: string | undefined,
): ParsedRequestUrl {
  const url = new URL(requestUrl ?? "/", "http://localhost");
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());
  return { pathname, query };
}

export async function readJsonBody(stream: Readable): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk, "utf8");

      chunks.push(buffer);
    });

    stream.once("error", (error) => {
      reject(error);
    });

    stream.once("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      try {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString("utf8");
        const body = JSON.parse(text);

        resolve(body);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function dispatchRoute(
  container: Container,
  routeMatch: RouteMatch,
  query: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const { route, params } = routeMatch;

  const args = await buildArguments(route, params, query, body);

  const controller = container.resolve(route.controllerToken);

  const handler = Reflect.get(controller, route.handlerKey);

  if (typeof handler !== "function") {
    throw new Error(`Handler ${route.handlerKey} is not a function`);
  }

  return handler.apply(controller, args);
}

export async function handleRequest(
  incomingMessage: IncomingMessage,
  serverResponse: ServerResponse,
  container: Container,
  routes: RouteDefinition[],
): Promise<void> {
  const { pathname, query } = parseRequestUrl(incomingMessage.url);
  const method = incomingMessage.method;
  if (method !== "GET" && method !== "POST") {
    sendJson(serverResponse, 404, {
      statusCode: 404,
      error: "Not Found",
    });
    return;
  }

  const route = matchRoute(routes, method, pathname);

  if (route === undefined) {
    sendJson(serverResponse, 404, {
      statusCode: 404,
      error: "Not Found",
    });
    return;
  }

  let body: unknown = undefined;

  try {
    if (method === "POST") {
      body = await readJsonBody(incomingMessage);
    }
  } catch (error) {
    sendJson(serverResponse, 400, {
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid JSON body",
    });
    return;
  }

  try {
    const result = await dispatchRoute(container, route, query, body);
    const statusCode = method === "GET" ? 200 : 201;

    sendJson(serverResponse, statusCode, result);
  } catch (error) {
    if (error instanceof DtoValidationError) {
      sendJson(serverResponse, 400, {
        statusCode: 400,
        error: "Bad Request",
        message: error.issues,
      });
      return;
    }

    sendJson(serverResponse, 500, {
      statusCode: 500,
      error: "Internal Server Error",
    });
    return;
  }
}
function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
