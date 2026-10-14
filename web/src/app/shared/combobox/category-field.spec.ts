import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import { of } from 'rxjs';
import { CategoriesService } from '../../core/categories.service';
import { Category } from '../../core/models';
import { CategoryFieldComponent } from './category-field';

@Component({
  imports: [CategoryFieldComponent],
  template: `<app-category-field [control]="control" />`,
})
class HostComponent {
  control = new FormControl<string | null>(null, Validators.required);
}

describe('CategoryFieldComponent', () => {
  let host: HostComponent;
  let loader: HarnessLoader;
  const existing: Category[] = [{ id: '1', name: 'Shirts', slot: 'top' }];
  const service = {
    list: vi.fn(() => of(existing)),
    create: vi.fn((name: string, slot: string) => of({ id: '9', name, slot })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: CategoriesService, useValue: service }] });
    const fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  const autocomplete = () => loader.getHarness(MatAutocompleteHarness);
  const optionTexts = async () => Promise.all((await (await autocomplete()).getOptions()).map((o) => o.getText()));

  describe('Requirement: Create a category while filling in an item', () => {
    it('Scenario: Typing matches an existing category', async () => {
      await (await autocomplete()).enterText('shi');
      expect(await optionTexts()).toContain('Shirts');
    });

    it('Scenario: Typed name matches an existing category exactly but in a different case', async () => {
      await (await autocomplete()).enterText('shirts');
      expect(await optionTexts()).toEqual(['Shirts']);
    });

    it('Scenario: Creating a new category inline', async () => {
      const ac = await autocomplete();
      await ac.enterText('Cardigans');
      await ac.selectOption({ text: "Create 'Cardigans'" });

      const dialog = await loader.getHarness(MatDialogHarness);
      expect(await dialog.getTitleText()).toContain('Cardigans');
      await (await dialog.getHarness(MatRadioGroupHarness)).checkRadioButton({ label: 'Top' });
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Create' }))).click();
      await vi.waitFor(() => expect(host.control.value).toBe('9'));

      expect(service.create).toHaveBeenCalledWith('Cardigans', 'top');
      expect(await ac.getValue()).toBe('Cardigans');
    });

    it('Scenario: Cancelling inline creation', async () => {
      const ac = await autocomplete();
      await ac.enterText('Cardigans');
      await ac.selectOption({ text: "Create 'Cardigans'" });

      const dialog = await loader.getHarness(MatDialogHarness);
      await (await dialog.getHarness(MatButtonHarness.with({ text: 'Cancel' }))).click();
      await vi.waitFor(async () => expect(await loader.getAllHarnesses(MatDialogHarness)).toEqual([]));

      expect(service.create).not.toHaveBeenCalled();
      expect(host.control.value).toBeNull();
    });
  });

  it('cannot create until a slot is picked', async () => {
    const ac = await autocomplete();
    await ac.enterText('Cardigans');
    await ac.selectOption({ text: "Create 'Cardigans'" });
    const dialog = await loader.getHarness(MatDialogHarness);
    expect(await (await dialog.getHarness(MatButtonHarness.with({ text: 'Create' }))).isDisabled()).toBe(true);
    await dialog.close();
  });

  it('offers all six slots', async () => {
    const ac = await autocomplete();
    await ac.enterText('Cardigans');
    await ac.selectOption({ text: "Create 'Cardigans'" });
    const dialog = await loader.getHarness(MatDialogHarness);
    const radios = await (await dialog.getHarness(MatRadioGroupHarness)).getRadioButtons();
    expect(await Promise.all(radios.map((r) => r.getLabelText()))).toEqual([
      'Top',
      'Bottom',
      'Outerwear',
      'Shoes',
      'Accessory',
      'Full body',
    ]);
    await dialog.close();
  });
});
