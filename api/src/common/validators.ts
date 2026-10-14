import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { isHexColor, normalizeHex } from '@stylevault/shared';
import { ValidateBy, ValidateIf, ValidationArguments } from 'class-validator';
import { isValidObjectId } from 'mongoose';

const isMissing = (value: unknown) => value === undefined || value === null;

const trimIfString = Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** A required string that is trimmed and must not be empty afterwards. */
export function IsRequiredText(label: string) {
  return applyDecorators(
    trimIfString,
    ValidateBy({
      name: 'isRequiredText',
      validator: {
        validate: (value) => typeof value === 'string' && value.length > 0,
        defaultMessage: ({ value }: ValidationArguments) =>
          isMissing(value) || typeof value === 'string' ? `${label} is required` : `${label} must be text`,
      },
    }),
  );
}

/** An optional string that is trimmed. */
export function IsOptionalText(label: string) {
  return applyDecorators(
    trimIfString,
    ValidateBy({
      name: 'isOptionalText',
      validator: {
        validate: (value) => isMissing(value) || typeof value === 'string',
        defaultMessage: () => `${label} must be text`,
      },
    }),
  );
}

/** A required value from a fixed list. */
export function IsOneOf(label: string, allowed: readonly string[]) {
  return ValidateBy({
    name: 'isOneOf',
    validator: {
      validate: (value) => allowed.includes(value),
      defaultMessage: ({ value }: ValidationArguments) =>
        isMissing(value)
          ? `${label} is required`
          : `${label} "${String(value)}" is not allowed (allowed: ${allowed.join(', ')})`,
    },
  });
}

/**
 * For PATCH bodies: skip validation when the field is absent, but validate it (and so
 * reject `null`) when it is present.
 */
export const IfPresent = () => ValidateIf((_object, value) => value !== undefined);

/** A hex color (`#RGB` or `#RRGGBB`, any case), stored as lowercase `#rrggbb`. */
export function IsHexColor(label: string, options: { required: boolean }) {
  return applyDecorators(
    Transform(({ value }) => normalizeHex(typeof value === 'string' ? value.trim() : value)),
    ValidateBy({
      name: 'isHexColor',
      validator: {
        validate: (value) => isHexColor(value) || (!options.required && value === null),
        defaultMessage: ({ value }: ValidationArguments) =>
          isMissing(value) || value === ''
            ? `${label} is required`
            : `${label} "${String(value)}" is not a valid hex color (use #RGB or #RRGGBB)`,
      },
    }),
  );
}

/** Zero or more values from a fixed list. Repeated values are removed. */
export function IsListOf(label: string, allowed: readonly string[]) {
  return applyDecorators(
    Transform(({ value }) => (Array.isArray(value) ? [...new Set(value)] : value)),
    ValidateBy({
      name: 'isListOf',
      validator: {
        validate: (value) => Array.isArray(value) && value.every((v) => allowed.includes(v)),
        defaultMessage: ({ value }: ValidationArguments) => {
          if (!Array.isArray(value)) return `${label} must be a list`;
          const bad = value.filter((v) => !allowed.includes(v)).map((v) => `"${String(v)}"`);
          return `${label} ${bad.join(', ')} ${bad.length === 1 ? 'is' : 'are'} not allowed (allowed: ${allowed.join(', ')})`;
        },
      },
    }),
  );
}

/** A reference to another resource by id. A malformed id can't exist, so it reads as "not found". */
export function IsReference(label: string, options: { required: boolean }) {
  return ValidateBy({
    name: 'isReference',
    validator: {
      validate: (value) => (typeof value === 'string' && isValidObjectId(value)) || (!options.required && value === null),
      defaultMessage: ({ value }: ValidationArguments) =>
        isMissing(value) || value === '' ? `${label} is required` : `${label} not found`,
    },
  });
}
