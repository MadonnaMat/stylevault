import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/** One entry of a 422 response's `errors` member. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * An API failure, read from an RFC 9457 Problem Details body. Requests made through
 * HttpClient fail with this instead of an HttpErrorResponse (see `apiErrorInterceptor`).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
    /** 422 field errors, keyed by field name. */
    readonly fieldErrors: Record<string, string> = {},
    /** For a blocked delete (409): how many items use the category or brand. */
    readonly itemCount?: number,
  ) {
    super(detail);
    this.name = 'ApiError';
  }

  static from(response: HttpErrorResponse): ApiError {
    const body = typeof response.error === 'object' && response.error !== null ? response.error : {};
    if (response.status === 0) {
      return new ApiError(0, 'Network error', 'Could not reach the server. Check that the API is running.');
    }
    const fieldErrors: Record<string, string> = {};
    for (const { field, message } of (body.errors ?? []) as FieldError[]) {
      fieldErrors[field] ??= message;
    }
    return new ApiError(
      response.status,
      body.title ?? response.statusText,
      body.detail ?? response.message,
      fieldErrors,
      typeof body.itemCount === 'number' ? body.itemCount : undefined,
    );
  }
}

/** Turns Problem Details error responses into ApiError. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) =>
      throwError(() => (error instanceof HttpErrorResponse ? ApiError.from(error) : error)),
    ),
  );

/** The message a blocked delete shows, such as "Used by 4 items". */
export function usedByMessage(itemCount: number): string {
  return `Used by ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
}
