import {
  INJECTABLE_METADATA,
  SCOPE_METADATA,
  INJECT_TOKENS_METADATA,
} from "./tokens";
import type { Constructor, Token } from "./tokens";

export class Container {
  private readonly singletonCache = new Map<Constructor<any>, unknown>();
  private readonly registry = new Map<Token, unknown>();

  resolve<T>(Target: Constructor<T>): T {
    if (!Reflect.getMetadata(INJECTABLE_METADATA, Target)) {
      throw new Error(`${Target.name} is not @Injectable()`);
    }

    const scope = Reflect.getMetadata(SCOPE_METADATA, Target) ?? "singleton";
    const isSingleton = scope === "singleton";

    if (isSingleton && this.singletonCache.has(Target)) {
      return this.singletonCache.get(Target) as T;
    }

    const dependencyTypes =
      (Reflect.getMetadata("design:paramtypes", Target) as
        | Constructor[]
        | undefined) ?? [];

    const injectTokens =
      (Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, Target) as
        | Map<number, Token>
        | undefined) ?? new Map<number, Token>();

    const dependencies = dependencyTypes.map(
      (Dependency: Constructor, parameterIndex: number) => {
        const token = injectTokens.get(parameterIndex) ?? Dependency;

        return this.resolveToken(token);
      },
    );

    const instance = new Target(...dependencies);

    if (isSingleton) {
      this.singletonCache.set(Target, instance);
    }

    return instance;
  }

  register(token: Token, value: unknown): void {
    this.registry.set(token, value);
  }

  private resolveToken<T>(token: Token): T {
    if (this.registry.has(token)) return this.registry.get(token) as T;

    if (typeof token === "function") {
      return this.resolve(token) as T;
    }

    throw new Error(`No provider registered for token ${String(token)}`);
  }
}
