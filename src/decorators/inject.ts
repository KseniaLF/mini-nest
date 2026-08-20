import { Token, INJECT_TOKENS_METADATA } from "../tokens";

export function Inject(token: Token): ParameterDecorator {
  return (Target, _propertyKey, parameterIndex) => {
    let metadata = Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, Target) as
      | Map<number, Token>
      | undefined;

    if (!metadata) {
      metadata = new Map<number, Token>();
    }
    metadata.set(parameterIndex, token);
    Reflect.defineMetadata(INJECT_TOKENS_METADATA, metadata, Target);
  };
}
