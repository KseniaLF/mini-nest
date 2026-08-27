const INJECTABLE_METADATA = Symbol("injectable");

const SCOPE_METADATA = Symbol("scope");

const INJECT_TOKENS_METADATA = Symbol("inject");

const CONTROLLER_PREFIX_METADATA = Symbol("controller-prefix");

const ROUTE_METADATA = Symbol("route");

const PARAM_METADATA = Symbol("param");

export {
  INJECTABLE_METADATA,
  SCOPE_METADATA,
  INJECT_TOKENS_METADATA,
  CONTROLLER_PREFIX_METADATA,
  ROUTE_METADATA,
  PARAM_METADATA,
};

export type Constructor<T = object> = new (...args: any[]) => T;

export type Token = Constructor | string | symbol;
