import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSnackBarHarness } from '@angular/material/snack-bar/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../core/api-error';
import { BrandsService } from '../core/brands.service';
import { Brand } from '../core/models';
import { BrandsPageComponent } from './brands-page';

describe('BrandsPageComponent', () => {
  let fixture: ComponentFixture<BrandsPageComponent>;
  let loader: HarnessLoader;
  let el: HTMLElement;
  let service: { list: ReturnType<typeof vi.fn>; rename: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };

  async function render(brands: Brand[]) {
    service = {
      list: vi.fn(() => of(brands)),
      rename: vi.fn((id: string, name: string) => of({ id, name })),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({ providers: [{ provide: BrandsService, useValue: service }] });
    fixture = TestBed.createComponent(BrandsPageComponent);
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  const names = () => [...el.querySelectorAll('.row .name')].map((n) => n.textContent?.trim());
  const button = (label: string) => loader.getHarness(MatButtonHarness.with({ selector: `[aria-label="${label}"]` }));
  const snackBarMessage = async () => (await loader.getHarness(MatSnackBarHarness)).getMessage();

  async function rename(from: string, to: string) {
    await (await button(`Rename ${from}`)).click();
    const input = await loader.getHarness(MatInputHarness.with({ selector: 'app-rename-field input' }));
    await input.setValue(to);
    await (await button('Save name')).click();
    await fixture.whenStable();
  }

  describe('Requirement: List brands', () => {
    it('Scenario: Listing brands', async () => {
      await render([
        { id: '1', name: "Arc'teryx" },
        { id: '2', name: 'Nike' },
        { id: '3', name: 'uniqlo' },
      ]);
      expect(names()).toEqual(["Arc'teryx", 'Nike', 'uniqlo']);
    });

    it('shows an empty state', async () => {
      await render([]);
      expect(el.textContent).toContain('No brands yet');
    });
  });

  describe('Requirement: Rename a brand', () => {
    it('Scenario: Renaming a brand', async () => {
      await render([{ id: '1', name: 'Levis' }]);
      await rename('Levis', "Levi's");
      expect(service.rename).toHaveBeenCalledWith('1', "Levi's");
      expect(names()).toEqual(["Levi's"]);
    });

    it('Scenario: Renaming to an existing name', async () => {
      await render([
        { id: '1', name: 'Nike' },
        { id: '2', name: 'Nikey' },
      ]);
      service.rename.mockReturnValue(throwError(() => new ApiError(409, 'Conflict', 'A brand named "NIKE" already exists.')));
      await rename('Nikey', 'NIKE');
      expect(await snackBarMessage()).toBe('A brand named "NIKE" already exists.');
      await (await button('Cancel rename')).click();
      expect(names()).toEqual(['Nike', 'Nikey']);
    });

    it('does not save an empty name', async () => {
      await render([{ id: '1', name: 'Nike' }]);
      await rename('Nike', '   ');
      expect(service.rename).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Name is required');
    });
  });

  describe('Requirement: Delete a brand only when unused', () => {
    it('Scenario: Deleting an unused brand', async () => {
      await render([{ id: '1', name: 'Nike' }]);
      await (await button('Delete Nike')).click();
      expect(service.delete).toHaveBeenCalledWith('1');
      expect(names()).toEqual([]);
    });

    it('Scenario: Deleting a brand in use', async () => {
      await render([{ id: '1', name: 'Nike' }]);
      service.delete.mockReturnValue(throwError(() => new ApiError(409, 'Conflict', 'Brand "Nike" is used by 2 items.', {}, 2)));
      await (await button('Delete Nike')).click();
      expect(await snackBarMessage()).toBe(`Can't delete "Nike": Used by 2 items`);
      expect(names()).toEqual(['Nike']);
    });

    it('Scenario: Deleting a brand that does not exist', async () => {
      await render([{ id: '1', name: 'Nike' }]);
      service.delete.mockReturnValue(throwError(() => new ApiError(404, 'Not Found', 'Brand not found.')));
      await (await button('Delete Nike')).click();
      expect(await snackBarMessage()).toBe('Brand not found.');
      expect(names()).toEqual([]);
    });
  });
});
