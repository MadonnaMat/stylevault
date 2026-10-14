import { ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldError, unprocessable } from './problem.exception';

function flatten(errors: ValidationError[], parent?: string): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/** The global ValidationPipe: DTO rule failures become 422 Problem Details with field `errors`. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    errorHttpStatusCode: 422,
    exceptionFactory: (errors) => unprocessable('The request has invalid fields.', flatten(errors)),
  });
}
