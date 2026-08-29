import type { IncomingMessage, ServerResponse } from "node:http";
import type { Constructor } from "../tokens";
import type { ParamMetadata } from "../decorators/params";

export interface Middleware {
  use(context: HttpContext, next: () => Promise<unknown>): Promise<unknown>;
}

export interface Guard {
  canActivate(context: HttpContext): boolean | Promise<boolean>;
}

export interface Pipe {
  transform(
    value: unknown,
    argument: ArgumentDefinition,
  ): unknown | Promise<unknown>;
}

export interface Interceptor {
  intercept(
    context: HttpContext,
    next: () => Promise<unknown>,
  ): Promise<unknown>;
}

export interface LifecycleConfig {
  middleware: Middleware;
  guard: Guard;
  pipe: Pipe;
  interceptor: Interceptor;
}

export interface HttpContext {
  request: IncomingMessage;
  response: ServerResponse;
}

export interface ArgumentDefinition {
  index: number;
  value: unknown;
  metadata: ParamMetadata;
  metatype?: Constructor;
}
