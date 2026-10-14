import type { Occasion, Season, Slot } from '@stylevault/shared';
import { Types } from 'mongoose';
import type { ItemDocument } from './item.schema';

/** The JSON shape of an item, with its category and brand filled in. */
export interface ItemView {
  id: string;
  name: string;
  /** null if the category was deleted after the item was saved (see design.md, Decision 4). */
  category: { id: string; name: string; slot: Slot } | null;
  brand: { id: string; name: string } | null;
  primaryColor: string;
  secondaryColor: string | null;
  seasons: Season[];
  occasions: Occasion[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PopulatedRef {
  _id: Types.ObjectId;
  name: string;
  slot?: Slot;
}

/**
 * `categoryId` and `brandId` are populated before this runs. A reference that points at a
 * missing document populates to null.
 */
export function toItemView(item: ItemDocument): ItemView {
  const category = item.categoryId as unknown as PopulatedRef | null;
  const brand = item.brandId as unknown as PopulatedRef | null;
  return {
    id: item.id,
    name: item.name,
    category: category && { id: category._id.toString(), name: category.name, slot: category.slot! },
    brand: brand && { id: brand._id.toString(), name: brand.name },
    primaryColor: item.primaryColor,
    secondaryColor: item.secondaryColor ?? null,
    seasons: item.seasons,
    occasions: item.occasions,
    notes: item.notes ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
