import type { Guard, HttpContext } from "../types/lifecycle";

export class AuthGuard implements Guard {
  canActivate(context: HttpContext): boolean {
    const { authorization } = context.request.headers;

    if (authorization) return true;
    return false;
  }
}
