import type { Occasion, Season, Slot } from '@stylevault/shared';

export interface Category {
  id: string;
  name: string;
  slot: Slot;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  /** null if the category was deleted after the item was saved. */
  category: Category | null;
  brand: Brand | null;
  primaryColor: string;
  secondaryColor: string | null;
  seasons: Season[];
  occasions: Occasion[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The body for creating an item, or (as a full replacement of the form's values) editing one. */
export interface ItemInput {
  name: string;
  categoryId: string;
  brandId: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  seasons: Season[];
  occasions: Occasion[];
  notes: string | null;
}
