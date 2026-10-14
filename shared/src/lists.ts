/** Where on the body a garment in a category is worn. */
export const SLOTS = ['top', 'bottom', 'outerwear', 'shoes', 'accessory', 'full-body'] as const;
export type Slot = (typeof SLOTS)[number];

export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = ['casual', 'work', 'formal', 'athletic'] as const;
export type Occasion = (typeof OCCASIONS)[number];
