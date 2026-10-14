import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { makeItem } from '../../testing/fixtures';
import { ApiError } from '../core/api-error';
import { ItemsService } from '../core/items.service';
import { Item } from '../core/models';
import { ItemDetailsComponent } from './item-details';

describe('ItemDetailsComponent', () => {
  let fixture: ComponentFixture<ItemDetailsComponent>;
  let el: HTMLElement;
  let loader: HarnessLoader;
  let items: { get: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(result: Observable<Item>) {
    items = { get: vi.fn(() => result), delete: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ItemsService, useValue: items }] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ItemDetailsComponent);
    fixture.componentRef.setInput('id', 'i1');
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }
  const text = (selector: string) => el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const tags = (selector: string) => [...el.querySelectorAll(`${selector} .tag`)].map((t) => t.textContent);

  describe("Requirement: View an item's details", () => {
    it('Scenario: Viewing an existing item', async () => {
      await render(of(makeItem()));
      expect(items.get).toHaveBeenCalledWith('i1');
      expect(text('h1')).toBe('Navy wool blazer');
      expect(text('.category')).toBe('Blazers Outerwear');
      expect(text('.slot')).toBe('Outerwear');
      expect(text('.brand')).toBe('Uniqlo');
      expect([...el.querySelectorAll('.colors code')].map((c) => c.textContent)).toEqual(['#1f2a44', '#c0a060']);
      expect(tags('.seasons')).toEqual(['Fall', 'Winter']);
      expect(tags('.occasions')).toEqual(['Work']);
      expect(text('.notes')).toBe('Dry clean only');
    });

    it('shows "None" for missing optional values', async () => {
      await render(of(makeItem({ brand: null, secondaryColor: null, seasons: [], occasions: [], notes: null })));
      expect(text('.brand')).toBe('None');
      expect(text('.seasons')).toBe('None');
      expect(text('.occasions')).toBe('None');
      expect(text('.notes')).toBe('None');
      expect(el.querySelectorAll('.colors app-swatch')).toHaveLength(1);
    });

    it('Scenario: Item does not exist', async () => {
      await render(throwError(() => new ApiError(404, 'Not Found', 'Item not found.')));
      expect(text('h1')).toBe('Item not found');
      expect(el.querySelector('dl')).toBeNull();
    });
  });

  describe('Requirement: Item colors are hex values', () => {
    it('Scenario: Colors are shown as swatches', async () => {
      await render(of(makeItem()));
      const swatches = [...el.querySelectorAll<HTMLElement>('.colors app-swatch')];
      expect(swatches.map((s) => s.getAttribute('aria-label'))).toEqual(['Primary color #1f2a44', 'Secondary color #c0a060']);
      expect(swatches.map((s) => s.style.backgroundColor)).toEqual(['rgb(31, 42, 68)', 'rgb(192, 160, 96)']);
    });
  });

  describe('Requirement: Delete an item', () => {
    beforeEach(() => render(of(makeItem())));

    async function startDelete() {
      await (await loader.getHarness(MatButtonHarness.with({ text: /Delete/ }))).click();
      return loader.getHarness(MatDialogHarness);
    }

    it('Scenario: Confirmed delete', async () => {
      const dialog = await startDelete();
      expect(await dialog.getTitleText()).toBe('Delete this item?');
      expect(items.delete).not.toHaveBeenCalled();
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Delete' }))).click();
      await vi.waitFor(() => expect(items.delete).toHaveBeenCalledWith('i1'));
      expect(navigate).toHaveBeenCalledWith(['/closet']);
    });

    it('Scenario: Cancelled delete', async () => {
      const dialog = await startDelete();
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
      await vi.waitFor(async () => expect(await loader.getAllHarnesses(MatDialogHarness)).toEqual([]));
      expect(items.delete).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(text('h1')).toBe('Navy wool blazer');
    });
  });
});
