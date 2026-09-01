import type { HttpContext, Interceptor } from "../types/lifecycle";

type LogFunction = (message: string) => void;

export class LoggingInterceptor implements Interceptor {
  constructor(private readonly log: LogFunction = console.log) {}

  async intercept(
    context: HttpContext,
    next: () => Promise<unknown>,
  ): Promise<unknown> {
    const time = performance.now();

    const result = await next();

    const { method, url } = context.request;
    const duration = performance.now() - time;
    const pathname = new URL(url ?? "/", "http://localhost").pathname;

    const formattedDuration = duration.toFixed(2);
    const res = `${method} ${pathname} — ${formattedDuration} ms`;

    this.log(res);

    return result;
  }
}
