import type { IncomingMessage, ServerResponse } from "node:http";

export interface Middleware {
  use(context: HttpContext, next: () => Promise<unknown>): Promise<unknown>;
}

export interface Guard {
  canActivate(context: HttpContext): boolean | Promise<boolean>;
}

export interface Pipe {
  transform(value: unknown): unknown | Promise<unknown>;
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
