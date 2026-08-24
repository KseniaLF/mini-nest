import { ROUTE_METADATA } from "../tokens";

type HttpMethod = "GET" | "POST";

interface RouteMetadata {
  method: HttpMethod;
  path: string;
}

function createMethodDecorator(
  method: HttpMethod,
  path: string,
): MethodDecorator {
  return (target, propertyKey) => {
    const metadata: RouteMetadata = {
      method,
      path,
    };

    Reflect.defineMetadata(ROUTE_METADATA, metadata, target, propertyKey);
  };
}

export function Get(path: string): MethodDecorator {
  return createMethodDecorator("GET", path);
}

export function Post(path: string): MethodDecorator {
  return createMethodDecorator("POST", path);
}
