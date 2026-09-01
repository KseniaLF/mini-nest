# Mini Nest

A small dependency injection container built with TypeScript and `reflect-metadata`.

The project demonstrates how NestJS discovers constructor dependencies and builds a dependency graph under the hood.

## Features

- `@Injectable()` class decorator
- Recursive dependency resolution through `design:paramtypes`
- Explicit dependency tokens with `@Inject(token)`
- String and `Symbol` tokens
- Singleton scope by default
- Transient scope
- Circular dependency detection with a readable dependency chain
- Decorator-based routing with `@Controller()`, `@Get()`, and `@Post()`
- Handler arguments through `@Body()`, `@Param()`, and `@Query()`
- Dynamic route parameters such as `/users/:id`
- HTTP dispatcher built on `node:http`
- Request validation with Zod 4 pipes
- Guards, interceptors, middleware, and exception filters
- Request-scoped context with `AsyncLocalStorage`
- Automated tests
- Docker support

## Requirements

- Node.js 22 or newer
- npm
- Docker and Docker Compose (optional)

## Installation

```bash
npm install
```

## Running tests

Locally:

```bash
npm test
```

With Docker:

```bash
docker compose run --rm api npm test
```

## Project structure

```text
src/
├── container.ts
├── dispatcher.ts
├── lifecycle.ts
├── router.ts
├── tokens.ts
├── context/
│   └── request-context.ts
├── decorators/
│   ├── controller.ts
│   ├── inject.ts
│   ├── injectable.ts
│   ├── methods.ts
│   └── params.ts
├── dto/
│   └── create-user.dto.ts
├── filters/
│   └── exception.filter.ts
├── guards/
│   └── auth.guard.ts
├── interceptors/
│   └── logging.interceptor.ts
├── pipes/
│   └── zod-validation.pipe.ts
├── services/
│   └── request-info.service.ts
└── types/
    ├── lifecycle.ts
    └── routing.ts

test/
├── auth.guard.test.ts
├── container.test.ts
├── controller.test.ts
├── dispatcher.test.ts
├── lifecycle.test.ts
├── logging.interceptor.test.ts
├── request-context.test.ts
└── ...
```

## How it works

The `@Injectable()` decorator marks a class as available for creation by the container and stores its scope in metadata.

When a decorated class has constructor parameters, the TypeScript compiler emits their runtime constructor types under the `design:paramtypes` metadata key. The container reads this metadata:

```typescript
Reflect.getMetadata("design:paramtypes", Target);
```

It then recursively resolves every dependency and creates the requested class with the resolved instances.

For this mechanism to work, the following options must be enabled in `tsconfig.json`:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

Without `emitDecoratorMetadata`, TypeScript does not emit constructor parameter metadata, so the container cannot discover dependencies automatically. The class must also have a decorator for `design:paramtypes` metadata to be emitted.

TypeScript interfaces disappear after compilation and cannot be used as runtime dependency identifiers. For such dependencies, `@Inject(token)` stores an explicit string or `Symbol` token for the constructor parameter. A ready value can be registered under that token in the container and returned without calling `new`.

Singleton providers are created once per container and then reused from its cache. Transient providers are created again for every resolution.

During recursive resolution, the container tracks the current dependency path. If the same class appears in the path twice, the container throws a descriptive error such as:

```text
A -> B -> A
```

This prevents an uninformative `RangeError: Maximum call stack size exceeded`.

## HTTP routing and dispatch

`@Controller(prefix)` stores a controller prefix on the class constructor.
`@Get(path)` and `@Post(path)` store the HTTP method and method-level path in
the corresponding method metadata.

At startup, `buildRoutes()` reads this metadata and creates full routes:

```text
@Controller("users") + @Get(":id")
→ GET /users/:id
```

For each request, the router compares the HTTP method and pathname. Dynamic
segments are extracted into an object:

```text
Template: /users/:id
Request:  /users/42
Params:   { id: "42" }
```

The Dispatcher parses query parameters and a JSON body, resolves the controller
through the IoC container, invokes the handler, and serializes its result as
JSON.

## How parameter decorators select argument positions

A parameter decorator receives `(target, propertyKey, parameterIndex)`.

`@Body()`, `@Param(name)`, and `@Query(name)` do not read request data when the
class is declared. They store instructions in the method metadata:

```text
index 0 → { type: "param", name: "id" }
index 1 → { type: "query", name: "limit" }
index 2 → { type: "body", name: undefined }
```

When a request arrives, the Dispatcher reads these instructions, takes each
value from `params`, `query`, or `body`, and assigns it to
`args[parameterIndex]`.

The handler is called with:

```ts
handler.apply(controller, transformedArgs);
```

Assigning values by index preserves the handler parameter order regardless of
decorator evaluation order.

## Request lifecycle

Every matched HTTP request passes through the following lifecycle:

```text
middleware
  → guard
    → interceptor (before)
      → pipe
        → handler
      ← interceptor (after)
```

The interceptor wraps the remaining execution: it runs code before calling
`next()`, waits for the handler result, and then runs its after-handler logic.

The exception filter is not merely the last sequential stage. The entire
lifecycle is executed inside a top-level `try/catch`, so the filter can handle
errors thrown by guards, interceptors, pipes, and handlers.

- Middleware establishes request-wide infrastructure such as the request context.
- Guard decides whether the request may continue.
- Pipe validates or transforms handler arguments.
- Handler executes the controller method.
- Interceptor observes or transforms execution before and after the handler.
- Exception filter maps errors to safe HTTP responses.

## Request context with AsyncLocalStorage

The request ID is stored in `AsyncLocalStorage` instead of a global variable.
A global variable would be overwritten when concurrent requests interleave
during asynchronous operations.

The request-context middleware reads `X-Request-Id` from the incoming request
or generates a new value. It then wraps the complete request lifecycle with
`AsyncLocalStorage.run()`. Promises, timers, and nested asynchronous calls
created within that execution inherit the same request store.

Services can read the current request ID through `RequestContext` without
receiving it as a method argument. Singleton services remain safe because they
do not store request-specific state in instance fields: each asynchronous
request chain has its own isolated store.

## Request validation

For an `@Body()` parameter, the Dispatcher builds an argument definition containing
the raw value, parameter metadata, and runtime metatype.

Immediately before the handler is called, `ZodValidationPipe` validates the body
with a Zod 4 schema. Valid input is returned to the handler as the parsed value.
Invalid input produces HTTP 400 containing all validation issues from
`error.issues`.
