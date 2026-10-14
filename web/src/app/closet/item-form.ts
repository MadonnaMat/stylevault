import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { normalizeHex, OCCASIONS, SEASONS, type Occasion, type Season } from '@stylevault/shared';
import { Observable } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ItemsService } from '../core/items.service';
import { Item, ItemInput } from '../core/models';
import { Notifier } from '../core/notifier';
import { ColorFieldComponent, hexColorValidator } from '../shared/color-field';
import { BrandFieldComponent } from '../shared/combobox/brand-field';
import { CategoryFieldComponent } from '../shared/combobox/category-field';
import { occasionLabel, seasonLabel } from '../shared/labels';

/** Like Validators.required, but whitespace-only text counts as empty (the API trims names). */
function requiredText(control: AbstractControl<string | null>): ValidationErrors | null {
  return control.value?.trim() ? null : { required: true };
}

/** `/closet/new` and `/closet/:id/edit`. */
@Component({
  selector: 'app-item-form',
  imports: [
    BrandFieldComponent,
    CategoryFieldComponent,
    ColorFieldComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <section class="page narrow">
      @if (notFound()) {
        <div class="not-found">
          <h1>Item not found</h1>
          <p>It may have been deleted.</p>
          <a mat-flat-button routerLink="/closet">Back to your closet</a>
        </div>
      } @else if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else {
        <header class="page-header">
          <h1>{{ isEdit() ? 'Edit item' : 'Add an item' }}</h1>
        </header>

        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" required placeholder="e.g. Navy wool blazer" />
            @if (form.controls.name.hasError('required')) {
              <mat-error>Name is required</mat-error>
            } @else if (form.controls.name.getError('api'); as message) {
              <mat-error>{{ message }}</mat-error>
            }
          </mat-form-field>

          <div class="row">
            <app-category-field [control]="form.controls.categoryId" />
            <app-brand-field [control]="form.controls.brandId" />
          </div>

          <div class="row">
            <app-color-field label="Primary color" [required]="true" [control]="form.controls.primaryColor" />
            <div class="secondary">
              <app-color-field label="Secondary color" [required]="true" [control]="form.controls.secondaryColor" />
              <mat-checkbox [formControl]="noSecondary">None</mat-checkbox>
            </div>
          </div>

          <fieldset>
            <legend>Seasons</legend>
            <mat-chip-listbox formControlName="seasons" [multiple]="true" aria-label="Seasons">
              @for (season of seasons; track season) {
                <mat-chip-option [value]="season">{{ seasonLabel(season) }}</mat-chip-option>
              }
            </mat-chip-listbox>
            @if (form.controls.seasons.getError('api'); as message) {
              <mat-error class="group-error">{{ message }}</mat-error>
            }
          </fieldset>

          <fieldset>
            <legend>Occasions</legend>
            <mat-chip-listbox formControlName="occasions" [multiple]="true" aria-label="Occasions">
              @for (occasion of occasions; track occasion) {
                <mat-chip-option [value]="occasion">{{ occasionLabel(occasion) }}</mat-chip-option>
              }
            </mat-chip-listbox>
            @if (form.controls.occasions.getError('api'); as message) {
              <mat-error class="group-error">{{ message }}</mat-error>
            }
          </fieldset>

          <mat-form-field appearance="outline">
            <mat-label>Notes</mat-label>
            <textarea matInput formControlName="notes" rows="3"></textarea>
            @if (form.controls.notes.getError('api'); as message) {
              <mat-error>{{ message }}</mat-error>
            }
          </mat-form-field>

          <div class="actions">
            <a mat-button [routerLink]="cancelLink()">Cancel</a>
            <button mat-flat-button type="submit" [disabled]="saving()">{{ isEdit() ? 'Save changes' : 'Add to closet' }}</button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .narrow { max-width: 720px; }
    form { display: flex; flex-direction: column; gap: 4px; }
    mat-form-field { width: 100%; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
    .secondary { display: flex; align-items: flex-start; gap: 8px; }
    .secondary app-color-field { flex: 1; }
    .secondary mat-checkbox { margin-top: 8px; }
    fieldset { border: none; padding: 0; margin: 0 0 20px; }
    legend { font: var(--mat-sys-title-small); color: var(--mat-sys-on-surface-variant); margin-bottom: 8px; }
    .group-error { display: block; font: var(--mat-sys-body-small); margin-top: 4px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .not-found { text-align: center; padding: 48px 16px; }
  `,
})
export class ItemFormComponent implements OnInit {
  /** The item being edited, from the `:id` route parameter. Absent when adding. */
  readonly id = input<string>();

  private readonly itemsService = inject(ItemsService);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly seasons = SEASONS;
  protected readonly occasions = OCCASIONS;
  protected readonly seasonLabel = seasonLabel;
  protected readonly occasionLabel = occasionLabel;

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly cancelLink = computed(() => (this.id() ? ['/closet', this.id()] : ['/closet']));
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: requiredText }),
    categoryId: new FormControl<string | null>(null, Validators.required),
    brandId: new FormControl<string | null>(null),
    primaryColor: new FormControl<string | null>('', [Validators.required, hexColorValidator]),
    secondaryColor: new FormControl<string | null>({ value: '', disabled: true }, [Validators.required, hexColorValidator]),
    seasons: new FormControl<Season[]>([], { nonNullable: true }),
    occasions: new FormControl<Occasion[]>([], { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });
  /** Checked when the item has no secondary color; disables that field. */
  protected readonly noSecondary = new FormControl(true, { nonNullable: true });

  ngOnInit(): void {
    this.noSecondary.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((none) => {
      const secondary = this.form.controls.secondaryColor;
      if (none) secondary.disable();
      else secondary.enable();
    });

    const id = this.id();
    if (id) this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.itemsService.get(id).subscribe({
      next: (item) => {
        this.fill(item);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        if (error instanceof ApiError && error.status === 404) this.notFound.set(true);
        else this.notifier.error(error);
      },
    });
  }

  private fill(item: Item): void {
    this.form.setValue({
      name: item.name,
      categoryId: item.category?.id ?? null,
      brandId: item.brand?.id ?? null,
      primaryColor: item.primaryColor,
      secondaryColor: item.secondaryColor ?? '',
      seasons: item.seasons,
      occasions: item.occasions,
      notes: item.notes ?? '',
    });
    this.noSecondary.setValue(item.secondaryColor === null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input = this.toInput();
    const id = this.id();
    const request: Observable<Item> = id ? this.itemsService.update(id, input) : this.itemsService.create(input);

    this.saving.set(true);
    request.subscribe({
      next: (item) => {
        this.saving.set(false);
        this.notifier.info(id ? 'Changes saved' : 'Added to your closet');
        void this.router.navigate(['/closet', item.id]);
      },
      error: (error) => {
        this.saving.set(false);
        this.showError(error);
      },
    });
  }

  private toInput(): ItemInput {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      categoryId: value.categoryId!,
      brandId: value.brandId,
      primaryColor: normalizeHex(value.primaryColor!.trim()) as string,
      secondaryColor: this.noSecondary.value ? null : (normalizeHex(value.secondaryColor!.trim()) as string),
      seasons: value.seasons,
      occasions: value.occasions,
      notes: value.notes.trim() || null,
    };
  }

  /** Puts 422 field messages next to their fields; anything else goes to the snackbar. */
  private showError(error: unknown): void {
    if (!(error instanceof ApiError) || error.status !== 422) {
      this.notifier.error(error);
      return;
    }
    let shown = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      const control = this.form.get(field);
      if (!control) continue;
      control.setErrors({ api: message });
      control.markAsTouched();
      shown = true;
    }
    if (!shown) this.notifier.error(error);
  }
}
