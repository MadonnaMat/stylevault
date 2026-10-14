import { describe, expect, it } from 'vitest';
import { HEX_COLOR_PATTERN, isHexColor, normalizeHex } from './hex';

describe('HEX_COLOR_PATTERN', () => {
  it.each(['#1f2a44', '#1F2A44', '#c0A060', '#fa0', '#FA0', '#Fa0'])('accepts %s', (value) => {
    expect(HEX_COLOR_PATTERN.test(value)).toBe(true);
  });

  it.each([
    ['a named color', 'navy'],
    ['five digits', '#12345'],
    ['a missing #', '1f2a44'],
    ['non-hex digits', '#ggg'],
    ['an 8-digit alpha form', '#1f2a44cc'],
    ['a 4-digit alpha form', '#fa0c'],
    ['an empty string', ''],
  ])('rejects %s (%s)', (_label, value) => {
    expect(HEX_COLOR_PATTERN.test(value)).toBe(false);
  });

  it('rejects non-strings in isHexColor', () => {
    expect(isHexColor(undefined)).toBe(false);
    expect(isHexColor(123)).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('lowercases 6-digit colors', () => {
    expect(normalizeHex('#1F2A44')).toBe('#1f2a44');
  });

  it('expands 3-digit colors by doubling each digit', () => {
    expect(normalizeHex('#FA0')).toBe('#ffaa00');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('leaves invalid values unchanged for validation to report', () => {
    expect(normalizeHex('navy')).toBe('navy');
    expect(normalizeHex(null)).toBe(null);
  });
});
