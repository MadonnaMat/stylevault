import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Response } from 'express';
import { ProblemException } from './problem.exception';

export const PROBLEM_JSON = 'application/problem+json';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  [extension: string]: unknown;
}

/** Errors thrown by Express middleware that Nest didn't wrap carry their own HTTP status. */
function middlewareStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown; statusCode?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
}

function detailOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join('; ');
  return typeof message === 'string' ? message : exception.message;
}

/** Renders every error as an RFC 9457 Problem Details body (`application/problem+json`). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const problem = this.toProblem(exception);
    host.switchToHttp().getResponse<Response>().status(problem.status).type(PROBLEM_JSON).json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const extensions = exception instanceof ProblemException ? exception.extensions : {};
      return { ...base(status), detail: detailOf(exception), ...extensions };
    }

    const status = middlewareStatus(exception);
    if (status !== undefined) {
      return { ...base(status), detail: (exception as Error).message };
    }

    this.logger.error(exception);
    return { ...base(HttpStatus.INTERNAL_SERVER_ERROR), detail: 'An unexpected error occurred.' };
  }
}

function base(status: number) {
  return { type: 'about:blank', title: STATUS_CODES[status] ?? 'Error', status };
}
