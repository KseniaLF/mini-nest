import { INJECTABLE_METADATA, SCOPE_METADATA } from "./tokens";

export type Constructor<T = object> = new (...args: any[]) => T;

export class Container {
  private readonly singletonCache = new Map<Constructor<any>, unknown>();

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

    const dependencies = dependencyTypes.map((Dependency: Constructor) =>
      this.resolve(Dependency),
    );

    const instance = new Target(...dependencies);

    if (isSingleton) {
      this.singletonCache.set(Target, instance);
    }

    return instance;
  }
}
