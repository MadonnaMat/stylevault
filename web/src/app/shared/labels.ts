import type { Occasion, Season, Slot } from '@stylevault/shared';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const slotLabel = (slot: Slot): string => (slot === 'full-body' ? 'Full body' : capitalize(slot));
export const seasonLabel = (season: Season): string => capitalize(season);
export const occasionLabel = (occasion: Occasion): string => capitalize(occasion);
