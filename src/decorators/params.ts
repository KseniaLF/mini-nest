import { PARAM_METADATA } from "../tokens";

export type ParamSource = "body" | "param" | "query";
export interface ParamMetadata {
  type: ParamSource;
  name: string | undefined;
}

function createParamDecorator(
  type: ParamSource,
  name: string | undefined,
): ParameterDecorator {
  return (Target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) {
      throw new Error(`@${type}() can only be used on a method parameter`);
    }

    let metadata = Reflect.getOwnMetadata(
      PARAM_METADATA,
      Target,
      propertyKey,
    ) as Map<number, ParamMetadata> | undefined;

    if (!metadata) {
      metadata = new Map<number, ParamMetadata>();
    }
    metadata.set(parameterIndex, { type, name });

    Reflect.defineMetadata(PARAM_METADATA, metadata, Target, propertyKey);
  };
}

export function Body(): ParameterDecorator {
  return createParamDecorator("body", undefined);
}

export function Param(name: string): ParameterDecorator {
  return createParamDecorator("param", name);
}

export function Query(name: string): ParameterDecorator {
  return createParamDecorator("query", name);
}
