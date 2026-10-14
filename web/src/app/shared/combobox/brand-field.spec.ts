import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { of } from 'rxjs';
import { BrandsService } from '../../core/brands.service';
import { BrandFieldComponent } from './brand-field';

@Component({
  imports: [BrandFieldComponent],
  template: `<app-brand-field [control]="control" />`,
})
class HostComponent {
  control = new FormControl<string | null>(null);
}

describe('BrandFieldComponent', () => {
  let host: HostComponent;
  let loader: HarnessLoader;
  const service = {
    list: vi.fn(() => of([{ id: '1', name: 'Nike' }])),
    create: vi.fn((name: string) => of({ id: '7', name })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: BrandsService, useValue: service }] });
    const fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  const autocomplete = () => loader.getHarness(MatAutocompleteHarness);
  const optionTexts = async () => Promise.all((await (await autocomplete()).getOptions()).map((o) => o.getText()));

  describe('Requirement: Create a brand while filling in an item', () => {
    it('Scenario: Typing matches an existing brand', async () => {
      await (await autocomplete()).enterText('ni');
      expect(await optionTexts()).toContain('Nike');
    });

    it('Scenario: Typed name matches an existing brand exactly but in a different case', async () => {
      await (await autocomplete()).enterText('nike');
      expect(await optionTexts()).toEqual(['Nike']);
    });

    it('Scenario: Creating a new brand inline', async () => {
      const ac = await autocomplete();
      await ac.enterText('Patagonia');
      await ac.selectOption({ text: "Create 'Patagonia'" });
      await vi.waitFor(() => expect(host.control.value).toBe('7'));
      expect(service.create).toHaveBeenCalledWith('Patagonia');
      expect(await ac.getValue()).toBe('Patagonia');
    });

    it('Scenario: Leaving the brand empty', async () => {
      const ac = await autocomplete();
      await ac.focus();
      await ac.blur();
      expect(service.create).not.toHaveBeenCalled();
      expect(host.control.value).toBeNull();
      expect(host.control.valid).toBe(true);
    });
  });
});
