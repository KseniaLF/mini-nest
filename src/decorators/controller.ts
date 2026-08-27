import { CONTROLLER_PREFIX_METADATA, INJECTABLE_METADATA } from "../tokens";

export function Controller(prefix: string): ClassDecorator {
  return (Target) => {
    Reflect.defineMetadata(CONTROLLER_PREFIX_METADATA, prefix, Target);
    Reflect.defineMetadata(INJECTABLE_METADATA, true, Target);
  };
}
