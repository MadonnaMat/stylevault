import { normalize } from './combobox/creatable-combobox';

/** Sorts by name ignoring case, the same order the API lists categories and brands in. */
export function byName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const [x, y] = [normalize(a.name), normalize(b.name)];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
