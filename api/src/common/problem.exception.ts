import { HttpException, HttpStatus } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * An HttpException that carries RFC 9457 extension members (for example `errors` or
 * `itemCount`). ProblemDetailsFilter copies them into the response body.
 */
export class ProblemException extends HttpException {
  constructor(
    status: HttpStatus,
    detail: string,
    readonly extensions: Record<string, unknown> = {},
  ) {
    super(detail, status);
  }
}

export function unprocessable(detail: string, errors: FieldError[]): ProblemException {
  return new ProblemException(HttpStatus.UNPROCESSABLE_ENTITY, detail, { errors });
}
