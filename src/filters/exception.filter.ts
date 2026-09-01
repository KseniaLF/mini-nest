import type { ServerResponse } from "node:http";
import type { ExceptionFilter, HttpContext } from "../types/lifecycle";
import { ForbiddenError, NotFoundError } from "../errors";
import { ValidationError } from "../pipes/zod-validation.pipe";

export class GlobalExceptionFilter implements ExceptionFilter {
  catch(error: unknown, context: HttpContext): void {
    const response = context.response;

    if (error instanceof ForbiddenError) {
      sendJson(response, 403, {
        statusCode: 403,
        error: "Forbidden",
      });
      return;
    }

    if (error instanceof ValidationError) {
      sendJson(response, 400, {
        statusCode: 400,
        error: "Bad Request",
        message: error.issues,
      });
      return;
    }

    if (error instanceof NotFoundError) {
      sendJson(response, 404, {
        statusCode: 404,
        error: "Not Found",
        message: error.message,
      });
      return;
    }

    sendJson(response, 500, {
      statusCode: 500,
      error: "Internal Server Error",
    });
    return;
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}
