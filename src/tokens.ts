const INJECTABLE_METADATA = Symbol("injectable");

const SCOPE_METADATA = Symbol("scope");

const INJECT_TOKENS_METADATA = Symbol("inject");

export { INJECTABLE_METADATA, SCOPE_METADATA, INJECT_TOKENS_METADATA };

export type Constructor<T = object> = new (...args: any[]) => T;

export type Token = Constructor | string | symbol;
