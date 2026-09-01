import * as z from "zod";
import type { ArgumentDefinition, Pipe } from "../types/lifecycle";

export class ValidationError extends Error {
  constructor(public readonly issues: z.ZodError["issues"]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class ZodValidationPipe implements Pipe {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown, argument: ArgumentDefinition): unknown {
    const source = argument.metadata.type;
    if (source !== "body") return value;

    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new ValidationError(result.error.issues);
  }
}
