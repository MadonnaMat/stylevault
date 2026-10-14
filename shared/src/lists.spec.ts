import { describe, expect, it } from 'vitest';
import { OCCASIONS, SEASONS, SLOTS } from './lists';

describe('fixed lists', () => {
  it('has the six slots', () => {
    expect(SLOTS).toEqual(['top', 'bottom', 'outerwear', 'shoes', 'accessory', 'full-body']);
  });

  it('has the four seasons', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'fall', 'winter']);
  });

  it('has the four occasions', () => {
    expect(OCCASIONS).toEqual(['casual', 'work', 'formal', 'athletic']);
  });
});
