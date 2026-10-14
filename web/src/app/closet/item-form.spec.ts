import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatChipListboxHarness } from '@angular/material/chips/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { blazers, makeItem, nike, shirts, uniqlo } from '../../testing/fixtures';
import { ApiError } from '../core/api-error';
import { BrandsService } from '../core/brands.service';
import { CategoriesService } from '../core/categories.service';
import { ItemsService } from '../core/items.service';
import { Item } from '../core/models';
import { ItemFormComponent } from './item-form';

describe('ItemFormComponent', () => {
  let fixture: ComponentFixture<ItemFormComponent>;
  let loader: HarnessLoader;
  let el: HTMLElement;
  let items: { get: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(id?: string, existing: Observable<Item> = of(makeItem())) {
    items = {
      get: vi.fn(() => existing),
      create: vi.fn(() => of(makeItem({ id: 'new' }))),
      update: vi.fn(() => of(makeItem())),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ItemsService, useValue: items },
        { provide: CategoriesService, useValue: { list: () => of([blazers, shirts]) } },
        { provide: BrandsService, useValue: { list: () => of([nike, uniqlo]) } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ItemFormComponent);
    if (id) fixture.componentRef.setInput('id', id);
    loader = TestbedHarnessEnvironment.loader(fixture);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  const field = (label: string) =>
    [...el.querySelectorAll('mat-form-field')].find((f) => f.querySelector('mat-label')?.textContent?.trim() === label)!;

  async function type(label: string, value: string) {
    const target = field(label).querySelector<HTMLInputElement | HTMLTextAreaElement>('.mat-mdc-input-element')!;
    target.value = value;
    target.dispatchEvent(new Event('input'));
    target.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }
  const valueOf = (label: string) => field(label).querySelector<HTMLInputElement>('.mat-mdc-input-element')!.value;
  const errorOf = (label: string) => field(label).querySelector('mat-error')?.textContent?.trim() ?? null;

  async function pick(label: 'Category' | 'Brand', text: string, option: string) {
    const ac = await loader.getHarness(MatAutocompleteHarness.with({ selector: `app-${label.toLowerCase()}-field input` }));
    await ac.enterText(text);
    await ac.selectOption({ text: option });
  }
  const chips = (label: string) => loader.getHarness(MatChipListboxHarness.with({ selector: `[aria-label="${label}"]` }));
  const noSecondary = () => loader.getHarness(MatCheckboxHarness.with({ label: 'None' }));

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  async function fillRequired() {
    await type('Name', 'Navy wool blazer');
    await pick('Category', 'bla', 'Blazers');
    await type('Primary color', '#1f2a44');
  }

  describe('adding (/closet/new)', () => {
    beforeEach(() => render());

    describe('Requirement: Add an item to the closet', () => {
      it('Scenario: Adding an item with all required fields', async () => {
        await fillRequired();
        await submit();
        expect(items.create).toHaveBeenCalledWith({
          name: 'Navy wool blazer',
          categoryId: 'c1',
          brandId: null,
          primaryColor: '#1f2a44',
          secondaryColor: null,
          seasons: [],
          occasions: [],
          notes: null,
        });
        // After saving, the user lands on the new item (the closet list shows it; see closet-list.spec.ts).
        expect(navigate).toHaveBeenCalledWith(['/closet', 'new']);
      });

      it('Scenario: Adding an item with every optional field', async () => {
        await fillRequired();
        await pick('Brand', 'uni', 'Uniqlo');
        await (await noSecondary()).uncheck();
        await type('Secondary color', '#c0a060');
        await (await chips('Seasons')).selectChips({ text: /Fall|Winter/ });
        await (await chips('Occasions')).selectChips({ text: 'Work' });
        await type('Notes', '  Dry clean only  ');
        await submit();
        expect(items.create).toHaveBeenCalledWith({
          name: 'Navy wool blazer',
          categoryId: 'c1',
          brandId: 'b1',
          primaryColor: '#1f2a44',
          secondaryColor: '#c0a060',
          seasons: ['fall', 'winter'],
          occasions: ['work'],
          notes: 'Dry clean only',
        });
      });

      it.each(['', '   '])('Scenario: Missing name (%j)', async (name) => {
        await fillRequired();
        await type('Name', name);
        await submit();
        expect(items.create).not.toHaveBeenCalled();
        expect(errorOf('Name')).toBe('Name is required');
      });

      it('Scenario: Missing category', async () => {
        await type('Name', 'Navy wool blazer');
        await type('Primary color', '#1f2a44');
        await submit();
        expect(items.create).not.toHaveBeenCalled();
        expect(errorOf('Category')).toBe('Category is required');
      });

      it('Scenario: Missing primary color', async () => {
        await type('Name', 'Navy wool blazer');
        await pick('Category', 'bla', 'Blazers');
        await submit();
        expect(items.create).not.toHaveBeenCalled();
        expect(errorOf('Primary color')).toBe('Primary color is required');
      });

      it('shows API field errors next to their fields', async () => {
        items.create.mockReturnValue(
          throwError(() => new ApiError(422, 'Unprocessable Entity', 'Category not found.', { categoryId: 'category not found' })),
        );
        await fillRequired();
        await submit();
        expect(errorOf('Category')).toBe('category not found');
        expect(navigate).not.toHaveBeenCalled();
      });
    });

    describe('Requirement: Item colors are hex values', () => {
      it('Scenario: Six-digit hex colors', async () => {
        await fillRequired();
        await type('Primary color', '#1F2A44');
        await (await noSecondary()).uncheck();
        await type('Secondary color', '#C0A060');
        await submit();
        expect(items.create).toHaveBeenCalledWith(
          expect.objectContaining({ primaryColor: '#1f2a44', secondaryColor: '#c0a060' }),
        );
      });

      it('Scenario: Three-digit hex color', async () => {
        await fillRequired();
        await type('Primary color', '#FA0');
        expect(errorOf('Primary color')).toBeNull();
        await submit();
        expect(items.create).toHaveBeenCalledWith(expect.objectContaining({ primaryColor: '#ffaa00' }));
      });

      it.each(['navy', '#12345', '1f2a44', '#ggg', '#1f2a44cc'])('Scenario: Invalid hex color (%s)', async (color) => {
        await fillRequired();
        await type('Primary color', color);
        await submit();
        expect(items.create).not.toHaveBeenCalled();
        expect(errorOf('Primary color')).toBe('Primary color must be a hex color like #1f2a44 or #fa0');
      });

      it('Scenario: Invalid hex color (secondary) says which color is invalid', async () => {
        await fillRequired();
        await (await noSecondary()).uncheck();
        await type('Secondary color', 'navy');
        await submit();
        expect(items.create).not.toHaveBeenCalled();
        expect(errorOf('Secondary color')).toBe('Secondary color must be a hex color like #1f2a44 or #fa0');
        expect(errorOf('Primary color')).toBeNull();
      });

      it('Scenario: No secondary color', async () => {
        await fillRequired();
        expect(await (await noSecondary()).isChecked()).toBe(true);
        await submit();
        expect(items.create).toHaveBeenCalledWith(expect.objectContaining({ secondaryColor: null }));
      });

      it('updates the swatch when a valid code is typed, including short forms', async () => {
        await type('Primary color', '#FA0');
        const picker = field('Primary color').querySelector<HTMLInputElement>('input[type="color"]')!;
        expect(picker.value).toBe('#ffaa00');
      });

      it('fills in the text field when a color is picked', async () => {
        const picker = field('Primary color').querySelector<HTMLInputElement>('input[type="color"]')!;
        picker.value = '#336699';
        picker.dispatchEvent(new Event('input'));
        await fixture.whenStable();
        expect(valueOf('Primary color')).toBe('#336699');
      });
    });
  });

  describe('editing (/closet/:id/edit)', () => {
    beforeEach(() => render('i1'));

    it('loads the item into the form', async () => {
      expect(items.get).toHaveBeenCalledWith('i1');
      expect(valueOf('Name')).toBe('Navy wool blazer');
      expect(valueOf('Category')).toBe('Blazers');
      expect(valueOf('Brand')).toBe('Uniqlo');
      expect(valueOf('Primary color')).toBe('#1f2a44');
      expect(valueOf('Secondary color')).toBe('#c0a060');
      expect(await (await noSecondary()).isChecked()).toBe(false);
    });

    describe('Requirement: Edit an item', () => {
      it('Scenario: Successful edit', async () => {
        await type('Name', 'Charcoal blazer');
        const occasions = await chips('Occasions');
        await (await occasions.getChips({ text: 'Work' }))[0].deselect();
        await occasions.selectChips({ text: 'Formal' });
        await submit();
        expect(items.update).toHaveBeenCalledWith(
          'i1',
          expect.objectContaining({ name: 'Charcoal blazer', occasions: ['formal'], categoryId: 'c1' }),
        );
        expect(navigate).toHaveBeenCalledWith(['/closet', 'i1']);
      });

      it('Scenario: Removing optional values', async () => {
        const brand = await loader.getHarness(MatAutocompleteHarness.with({ selector: 'app-brand-field input' }));
        await brand.clear();
        await (await noSecondary()).check();
        await submit();
        expect(items.update).toHaveBeenCalledWith('i1', expect.objectContaining({ brandId: null, secondaryColor: null }));
      });

      it('Scenario: Invalid edit', async () => {
        await type('Primary color', 'navy');
        await submit();
        expect(items.update).not.toHaveBeenCalled();
        expect(errorOf('Primary color')).toContain('must be a hex color');
      });

      it('shows a rejected edit from the API next to the field and stays on the form', async () => {
        items.update.mockReturnValue(
          throwError(
            () => new ApiError(422, 'Unprocessable Entity', 'The request has invalid fields.', { primaryColor: 'primary color is invalid' }),
          ),
        );
        await submit();
        expect(errorOf('Primary color')).toBe('primary color is invalid');
        expect(navigate).not.toHaveBeenCalled();
      });
    });
  });

  it('Scenario: Editing an item that does not exist', async () => {
    await render('missing', throwError(() => new ApiError(404, 'Not Found', 'Item not found.')));
    expect(el.textContent).toContain('Item not found');
    expect(el.querySelector('form')).toBeNull();
  });
});
