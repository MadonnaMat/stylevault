/** A hex color in `#RGB` or `#RRGGBB` form, in any letter case. Alpha forms are not allowed. */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

/**
 * Converts a valid hex color to lowercase `#rrggbb`, expanding short forms by doubling
 * each digit (`#FA0` becomes `#ffaa00`). Values that aren't valid hex colors are
 * returned unchanged so that validation can report them.
 */
export function normalizeHex<T>(value: T): T | string {
  if (!isHexColor(value)) return value;
  const digits = value.slice(1).toLowerCase();
  if (digits.length === 6) return `#${digits}`;
  return `#${[...digits].map((d) => d + d).join('')}`;
}
