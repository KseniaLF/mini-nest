import { INJECTABLE_METADATA, SCOPE_METADATA } from "../tokens";

export type Scope = "singleton" | "transient";

export interface InjectableOptions {
  scope?: Scope;
}

export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (Target) => {
    Reflect.defineMetadata(INJECTABLE_METADATA, true, Target);

    const scope = options.scope ?? "singleton";
    Reflect.defineMetadata(SCOPE_METADATA, scope, Target);
  };
}
