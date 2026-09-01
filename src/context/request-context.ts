import { AsyncLocalStorage } from "node:async_hooks";
import type { Middleware } from "../types/lifecycle";
import { randomUUID } from "node:crypto";

const als = new AsyncLocalStorage<{ requestId: string }>();

export class RequestContext {
  static get requestId(): string {
    const store = als.getStore();
    if (!store) throw new Error("No requestId");
    return store.requestId;
  }

  static run<T>(requestId: string, callback: () => T): T {
    return als.run({ requestId }, callback);
  }
}

export const requestContextMiddleware: Middleware = {
  async use(context, next) {
    const { request, response } = context;

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    response.setHeader("x-request-id", requestId);
    return RequestContext.run(requestId, next);
  },
};
