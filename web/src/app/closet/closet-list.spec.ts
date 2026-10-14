import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { makeItem, shirts } from '../../testing/fixtures';
import { ItemsService } from '../core/items.service';
import { Item } from '../core/models';
import { ClosetListComponent } from './closet-list';

async function render(items: Item[]) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: ItemsService, useValue: { list: () => of(items) } }],
  });
  const fixture = TestBed.createComponent(ClosetListComponent);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ClosetListComponent', () => {
  describe('Requirement: View the closet', () => {
    it('Scenario: Closet with items', async () => {
      // The API returns items newest first; the list keeps that order.
      const el = await render([
        makeItem({ id: 'new', name: 'Linen shirt', category: shirts, brand: null, primaryColor: '#ffffff', secondaryColor: null }),
        makeItem({ id: 'old', name: 'Navy wool blazer' }),
      ]);
      const rows = [...el.querySelectorAll('.items li')];
      expect(rows.map((r) => r.querySelector('.name')?.textContent?.trim())).toEqual(['Linen shirt', 'Navy wool blazer']);

      const [linen, blazer] = rows;
      expect(linen.querySelector('.category')?.textContent).toBe('Shirts');
      expect(linen.querySelector('.brand')).toBeNull();
      expect(linen.querySelectorAll('app-swatch')).toHaveLength(1);

      expect(blazer.querySelector('.category')?.textContent).toBe('Blazers');
      expect(blazer.querySelector('.brand')?.textContent).toBe('Uniqlo');
      const swatches = [...blazer.querySelectorAll<HTMLElement>('app-swatch')];
      expect(swatches.map((s) => s.getAttribute('aria-label'))).toEqual(['Primary color #1f2a44', 'Secondary color #c0a060']);
      expect(swatches[0].style.backgroundColor).toBe('rgb(31, 42, 68)');

      expect(blazer.querySelector('a')?.getAttribute('href')).toBe('/closet/old');
      expect(el.querySelector('.empty-state')).toBeNull();
    });

    it('Scenario: Empty closet', async () => {
      const el = await render([]);
      const empty = el.querySelector('.empty-state');
      expect(empty?.textContent).toContain('Your closet is empty');
      const link = empty?.querySelector('a');
      expect(link?.textContent).toContain('Add your first item');
      expect(link?.getAttribute('href')).toBe('/closet/new');
      expect(el.querySelector('.items')).toBeNull();
    });
  });

  it('shows "No category" when an item\'s category is missing', async () => {
    const el = await render([makeItem({ category: null })]);
    expect(el.querySelector('.category')?.textContent).toBe('No category');
  });
});
