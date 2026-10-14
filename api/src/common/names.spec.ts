import { cleanName, normalizeName } from './names';

describe('cleanName', () => {
  it('removes surrounding whitespace', () => {
    expect(cleanName('  Sneakers  ')).toBe('Sneakers');
  });

  it('keeps inner whitespace and letter case', () => {
    expect(cleanName(' Jackets & Blazers ')).toBe('Jackets & Blazers');
  });
});

describe('normalizeName', () => {
  it('trims and lowercases', () => {
    expect(normalizeName(' Shirts ')).toBe('shirts');
    expect(normalizeName('nike ')).toBe(normalizeName('Nike'));
  });

  it('trims tabs and newlines too', () => {
    expect(normalizeName('\tLevi\'s\n')).toBe("levi's");
  });
});
