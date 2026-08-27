import { validate } from "class-validator";
import { Constructor } from "../tokens";
import { plainToInstance } from "class-transformer";

export interface ValidationIssue {
  field: string;
  constraints: Record<string, string>;
}

export class DtoValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("DTO validation failed");
    this.name = "DtoValidationError";
  }
}

export class ValidationPipe {
  async transform<T extends object>(
    value: unknown,
    metatype: Constructor<T>,
  ): Promise<T> {
    const instance = plainToInstance(metatype, value);

    const errors = await validate(instance);

    if (errors.length === 0) return instance;
    const issues: ValidationIssue[] = errors.map((error) => ({
      field: error.property,
      constraints: error.constraints ?? {},
    }));
    throw new DtoValidationError(issues);
  }
}
