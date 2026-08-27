import { Constructor } from "../tokens";

export type HttpMethod = "GET" | "POST";

export interface RouteMetadata {
  method: HttpMethod;
  path: string;
}

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  controllerToken: Constructor;
  handlerKey: string;
}

export interface RouteMatch {
  route: RouteDefinition;
  params: Record<string, string>;
}

export interface ParsedRequestUrl {
  pathname: string;
  query: Record<string, string>;
}
