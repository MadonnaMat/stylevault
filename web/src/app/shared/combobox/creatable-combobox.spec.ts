import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { ComboboxOption, CreatableComboboxComponent, CreateOption } from './creatable-combobox';

@Component({
  imports: [CreatableComboboxComponent],
  template: `<app-creatable-combobox label="Category" [required]="true" [options]="options" [control]="control" [create]="create" />`,
})
class HostComponent {
  options: ComboboxOption[] = [
    { id: '1', name: 'Shirts' },
    { id: '2', name: 'Tees' },
    { id: '3', name: 'Blazers' },
  ];
  control = new FormControl<string | null>(null, Validators.required);
  created: ComboboxOption | null = { id: '9', name: 'Cardigans' };
  create = vi.fn<CreateOption>(async () => this.created);
}

describe('CreatableComboboxComponent', () => {
  let host: HostComponent;
  let loader: HarnessLoader;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    await fixture.whenStable();
  });

  const autocomplete = () => loader.getHarness(MatAutocompleteHarness);
  const optionTexts = async (text: string) => {
    const ac = await autocomplete();
    await ac.enterText(text);
    return Promise.all((await ac.getOptions()).map((o) => o.getText()));
  };

  it('offers options that contain the typed text, ignoring case', async () => {
    expect(await optionTexts('shi')).toEqual(['Shirts', "Create 'shi'"]);
  });

  it('does not offer to create when the typed text matches an option exactly in a different case', async () => {
    expect(await optionTexts('shirts')).toEqual(['Shirts']);
  });

  it('ignores surrounding whitespace when looking for an exact match', async () => {
    expect(await optionTexts('  TEES ')).toEqual(['Tees']);
  });

  it('offers only to create when nothing matches', async () => {
    expect(await optionTexts('Cardigans')).toEqual(["Create 'Cardigans'"]);
  });

  it('selects an existing option', async () => {
    const ac = await autocomplete();
    await ac.enterText('bla');
    await ac.selectOption({ text: 'Blazers' });
    expect(host.control.value).toBe('3');
    expect(await ac.getValue()).toBe('Blazers');
  });

  it('creates and selects a new option', async () => {
    const ac = await autocomplete();
    await ac.enterText(' Cardigans ');
    await ac.selectOption({ text: "Create 'Cardigans'" });
    expect(host.create).toHaveBeenCalledWith('Cardigans');
    expect(host.control.value).toBe('9');
    expect(await ac.getValue()).toBe('Cardigans');
  });

  it('leaves the value unset when creating is cancelled', async () => {
    host.created = null;
    const ac = await autocomplete();
    await ac.enterText('Cardigans');
    await ac.selectOption({ text: "Create 'Cardigans'" });
    expect(host.control.value).toBeNull();
  });

  it('clears the selection when the user types over it', async () => {
    const ac = await autocomplete();
    await ac.enterText('Tees');
    await ac.selectOption({ text: 'Tees' });
    expect(host.control.value).toBe('2');
    await ac.enterText('x');
    expect(host.control.value).toBeNull();
  });

  it('shows the name of a value set from outside', async () => {
    host.control.setValue('1');
    expect(await (await autocomplete()).getValue()).toBe('Shirts');
  });
});
