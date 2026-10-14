import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBarHarness } from '@angular/material/snack-bar/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { CategoriesService } from '../core/categories.service';
import { Category } from '../core/models';
import { CategoriesPageComponent } from './categories-page';

describe('CategoriesPageComponent', () => {
  let fixture: ComponentFixture<CategoriesPageComponent>;
  let loader: HarnessLoader;
  let el: HTMLElement;
  let service: { list: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  async function render(categories: Category[]) {
    service = {
      list: vi.fn(() => of(categories)),
      update: vi.fn((id: string, changes: Partial<Category>) => of({ ...categories.find((c) => c.id === id)!, ...changes })),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: CategoriesService, useValue: service }] });
    fixture = TestBed.createComponent(CategoriesPageComponent);
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  const names = () => [...el.querySelectorAll('.row .name')].map((n) => n.textContent?.trim());
  const button = (label: string) => loader.getHarness(MatButtonHarness.with({ selector: `[aria-label="${label}"]` }));
  const slotSelect = (name: string) => loader.getHarness(MatSelectHarness.with({ selector: `[aria-label="Slot for ${name}"]` }));
  const snackBarMessage = async () => (await loader.getHarness(MatSnackBarHarness)).getMessage();

  async function rename(from: string, to: string) {
    await (await button(`Rename ${from}`)).click();
    const input = await loader.getHarness(MatInputHarness.with({ selector: 'app-rename-field input' }));
    await input.setValue(to);
    await (await button('Save name')).click();
    await fixture.whenStable();
  }

  describe('Requirement: List categories', () => {
    it('Scenario: Listing categories', async () => {
      await render([
        { id: '1', name: 'Blazers', slot: 'outerwear' },
        { id: '2', name: 'Cardigans', slot: 'top' },
        { id: '3', name: 'shoes-casual', slot: 'shoes' },
      ]);
      expect(names()).toEqual(['Blazers', 'Cardigans', 'shoes-casual']);
      expect(await (await slotSelect('Blazers')).getValueText()).toBe('Outerwear');
      expect(await (await slotSelect('Cardigans')).getValueText()).toBe('Top');
      expect(await (await slotSelect('shoes-casual')).getValueText()).toBe('Shoes');
    });

    it('shows an empty state', async () => {
      await render([]);
      expect(el.textContent).toContain('No categories yet');
    });
  });

  describe('Requirement: Rename a category', () => {
    it('Scenario: Renaming a category', async () => {
      await render([{ id: '1', name: 'Blazers', slot: 'outerwear' }]);
      await rename('Blazers', 'Jackets & Blazers');
      expect(service.update).toHaveBeenCalledWith('1', { name: 'Jackets & Blazers' });
      expect(names()).toEqual(['Jackets & Blazers']);
    });

    it('keeps the list in alphabetical order after a rename', async () => {
      await render([
        { id: '1', name: 'Blazers', slot: 'outerwear' },
        { id: '2', name: 'Cardigans', slot: 'top' },
      ]);
      await rename('Blazers', 'Shirts');
      expect(names()).toEqual(['Cardigans', 'Shirts']);
    });

    it('Scenario: Renaming to an existing name', async () => {
      await render([
        { id: '1', name: 'Shirts', slot: 'top' },
        { id: '2', name: 'Tees', slot: 'top' },
      ]);
      service.update.mockReturnValue(
        throwError(() => new ApiError(409, 'Conflict', 'A category named "SHIRTS" already exists.')),
      );
      await rename('Tees', 'SHIRTS');
      expect(await snackBarMessage()).toBe('A category named "SHIRTS" already exists.');
      await (await button('Cancel rename')).click();
      expect(names()).toEqual(['Shirts', 'Tees']);
    });
  });

  describe("Requirement: Change a category's slot", () => {
    it('Scenario: Changing the slot', async () => {
      await render([{ id: '2', name: 'Cardigans', slot: 'top' }]);
      const select = await slotSelect('Cardigans');
      await select.open();
      await select.clickOptions({ text: 'Outerwear' });
      expect(service.update).toHaveBeenCalledWith('2', { slot: 'outerwear' });
      expect(await select.getValueText()).toBe('Outerwear');
    });

    it('Scenario: Changing to an unknown slot (only the allowed slots are offered)', async () => {
      await render([{ id: '2', name: 'Cardigans', slot: 'top' }]);
      const select = await slotSelect('Cardigans');
      await select.open();
      const options = await select.getOptions();
      expect(await Promise.all(options.map((o) => o.getText()))).toEqual([
        'Top',
        'Bottom',
        'Outerwear',
        'Shoes',
        'Accessory',
        'Full body',
      ]);
    });

    it('keeps the previous slot when the API rejects the change', async () => {
      await render([{ id: '2', name: 'Cardigans', slot: 'top' }]);
      service.update.mockReturnValue(throwError(() => new ApiError(422, 'Unprocessable Entity', 'slot is not allowed')));
      const select = await slotSelect('Cardigans');
      await select.open();
      await select.clickOptions({ text: 'Shoes' });
      await fixture.whenStable();
      expect(await select.getValueText()).toBe('Top');
    });
  });

  describe('Requirement: Delete a category only when unused', () => {
    it('Scenario: Deleting an unused category', async () => {
      await render([{ id: '1', name: 'Blazers', slot: 'outerwear' }]);
      await (await button('Delete Blazers')).click();
      expect(service.delete).toHaveBeenCalledWith('1');
      expect(names()).toEqual([]);
    });

    it('Scenario: Deleting a category in use', async () => {
      await render([{ id: '1', name: 'Shirts', slot: 'top' }]);
      service.delete.mockReturnValue(
        throwError(() => new ApiError(409, 'Conflict', 'Category "Shirts" is used by 4 items.', {}, 4)),
      );
      await (await button('Delete Shirts')).click();
      expect(await snackBarMessage()).toBe(`Can't delete "Shirts": Used by 4 items`);
      expect(names()).toEqual(['Shirts']);
    });

    it('Scenario: Deleting a category that does not exist', async () => {
      await render([{ id: '1', name: 'Shirts', slot: 'top' }]);
      service.delete.mockReturnValue(throwError(() => new ApiError(404, 'Not Found', 'Category not found.')));
      await (await button('Delete Shirts')).click();
      expect(await snackBarMessage()).toBe('Category not found.');
      expect(names()).toEqual([]);
    });
  });
});
