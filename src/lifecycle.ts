import type { HttpContext, LifecycleConfig } from "./types/lifecycle";

export async function executeLifecycle(
  config: LifecycleConfig,
  context: HttpContext,
  value: unknown,
  handler: (data: unknown) => Promise<unknown> | unknown,
): Promise<unknown> {
  async function nextInterceptor() {
    const transformedValue = await config.pipe.transform(value);

    return handler(transformedValue);
  }

  async function nextMiddleware() {
    const guard = await config.guard.canActivate(context);

    if (!guard) throw new Error("Forbidden");

    return config.interceptor.intercept(context, nextInterceptor);
  }

  return config.middleware.use(context, nextMiddleware);
}
