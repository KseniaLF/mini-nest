import { Readable } from "node:stream";
import { ParamMetadata } from "./decorators/params";
import { PARAM_METADATA } from "./tokens";
import { ParsedRequestUrl, RouteDefinition } from "./types/routing";

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
