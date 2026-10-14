import { Brand, Category, Item } from '../app/core/models';

export const blazers: Category = { id: 'c1', name: 'Blazers', slot: 'outerwear' };
export const shirts: Category = { id: 'c2', name: 'Shirts', slot: 'top' };
export const uniqlo: Brand = { id: 'b1', name: 'Uniqlo' };
export const nike: Brand = { id: 'b2', name: 'Nike' };

export function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'Navy wool blazer',
    category: blazers,
    brand: uniqlo,
    primaryColor: '#1f2a44',
    secondaryColor: '#c0a060',
    seasons: ['fall', 'winter'],
    occasions: ['work'],
    notes: 'Dry clean only',
    createdAt: '2026-10-14T12:00:00.000Z',
    updatedAt: '2026-10-14T12:00:00.000Z',
    ...overrides,
  };
}
