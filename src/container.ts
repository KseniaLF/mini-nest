import { INJECTABLE_METADATA } from "./tokens";

export type Constructor<T = object> = new (...args: any[]) => T;

export class Container {
  resolve<T>(Target: Constructor<T>): T {
    if (!Reflect.getMetadata(INJECTABLE_METADATA, Target)) {
      throw new Error(`${Target.name} is not @Injectable()`);
    }

    const dependencyTypes =
      (Reflect.getMetadata("design:paramtypes", Target) as
        | Constructor[]
        | undefined) ?? [];

    const dependencies = dependencyTypes.map((Dependency: Constructor) =>
      this.resolve(Dependency),
    );

    const instance = new Target(...dependencies);

    return instance;
  }
}
