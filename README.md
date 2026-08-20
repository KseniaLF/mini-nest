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
├── tokens.ts
└── decorators/
    ├── inject.ts
    └── injectable.ts

test/
├── container.test.ts
├── inject.test.ts
├── injectable.test.ts
└── metadata.test.ts
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
