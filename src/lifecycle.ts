import { ForbiddenError } from "./errors";
import { GlobalExceptionFilter } from "./filters/exception.filter";
import type {
  ArgumentDefinition,
  Guard,
  HttpContext,
  Interceptor,
  LifecycleConfig,
  Middleware,
  Pipe,
} from "./types/lifecycle";

const guard: Guard = {
  canActivate(_context) {
    return true;
  },
};

const pipe: Pipe = {
  transform(value: unknown) {
    return value;
  },
};

const interceptor: Interceptor = {
  async intercept(_context, next) {
    const result = await next();
    return result;
  },
};

const middleware: Middleware = {
  async use(_context, next) {
    return next();
  },
};

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  middleware,
  guard,
  pipe,
  interceptor,
  filter: new GlobalExceptionFilter(),
};

export async function executeLifecycle(
  config: LifecycleConfig,
  context: HttpContext,
  definitions: ArgumentDefinition[],
  handler: (...args: unknown[]) => unknown | Promise<unknown>,
): Promise<unknown> {
  async function nextInterceptor() {
    const transformedArgs = await applyPipes(definitions, config.pipe);
    return handler(...transformedArgs);
  }

  async function nextMiddleware() {
    const guard = await config.guard.canActivate(context);

    if (!guard) throw new ForbiddenError();

    return config.interceptor.intercept(context, nextInterceptor);
  }

  return config.middleware.use(context, nextMiddleware);
}

export async function applyPipes(
  definitions: ArgumentDefinition[],
  pipe: Pipe,
): Promise<unknown[]> {
  const args: unknown[] = [];

  for (const definition of definitions) {
    const pipeResult = await pipe.transform(definition.value, definition);
    args[definition.index] = pipeResult;
  }
  return [...args];
}
