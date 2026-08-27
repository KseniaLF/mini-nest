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
- DTO transformation and validation with `class-transformer` and `class-validator`
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
├── router.ts
├── tokens.ts
├── decorators/
│   ├── controller.ts
│   ├── inject.ts
│   ├── injectable.ts
│   ├── methods.ts
│   └── params.ts
├── dto/
│   └── create-user.dto.ts
├── pipes/
│   └── validation.pipe.ts
└── types/
    └── routing.ts

test/
├── container.test.ts
├── controller.test.ts
├── dispatcher.test.ts
├── inject.test.ts
├── injectable.test.ts
├── metadata.test.ts
├── methods.test.ts
├── params.test.ts
└── router.test.ts
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
handler.apply(controller, args);
```

Assigning values by index preserves the handler parameter order regardless of
decorator evaluation order.

## DTO validation

For an `@Body()` parameter, the Dispatcher reads its runtime class from
`design:paramtypes`.

`ValidationPipe` uses `plainToInstance()` to create a DTO instance and
`class-validator` to validate its fields. Valid data reaches the handler as a
DTO instance. Invalid data produces HTTP 400 with every invalid field and its
constraint messages.
