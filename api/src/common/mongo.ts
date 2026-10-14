import { NotFoundException, PipeTransform } from '@nestjs/common';
import { isValidObjectId, SchemaOptions } from 'mongoose';

/** MongoDB reports a unique index violation as error code 11000. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 11000;
}

/**
 * Validates an `:id` route parameter. An id that isn't a valid ObjectId can't name an
 * existing resource, so it gets the same 404 as an unknown id.
 */
export class ObjectIdPipe implements PipeTransform<string, string> {
  constructor(private readonly resource: string) {}

  transform(value: string): string {
    if (!isValidObjectId(value)) throw new NotFoundException(`${this.resource} not found.`);
    return value;
  }
}

/**
 * Schema options for API resources: timestamps, and JSON output with `id` instead of
 * `_id`/`__v`. Fields listed in `hidden` (such as `normalizedName`) are left out.
 */
export function resourceSchemaOptions(hidden: string[] = []): SchemaOptions {
  return {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        for (const field of hidden) delete ret[field];
        return ret;
      },
    },
  };
}
