import { Component, computed, DestroyRef, effect, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { startWith } from 'rxjs';

export interface ComboboxOption {
  id: string;
  name: string;
}

/** Creates a record from the typed name. Resolves to null if the user cancelled. */
export type CreateOption = (name: string) => Promise<ComboboxOption | null>;

/** Trimmed and lowercased, matching how the API compares category and brand names. */
export const normalize = (name: string) => name.trim().toLowerCase();

const CREATE = Symbol('create');

/**
 * A text field with autocomplete over existing options, plus a "Create '<text>'" option when
 * the typed text matches none of them exactly (ignoring case and surrounding whitespace).
 * `control` holds the selected option's id, or null.
 */
@Component({
  selector: 'app-creatable-combobox',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [formControl]="text"
        [matAutocomplete]="auto"
        [required]="required()"
        [errorStateMatcher]="errorState"
        [placeholder]="placeholder()"
        (blur)="control().markAsTouched()"
      />
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="display" (optionSelected)="select($event.option.value)">
        @for (option of matches(); track option.id) {
          <mat-option [value]="option">{{ option.name }}</mat-option>
        }
        @if (canCreate()) {
          <mat-option [value]="CREATE" class="create-option">Create '{{ query().trim() }}'</mat-option>
        }
      </mat-autocomplete>
      @if (errorMessage(); as message) {
        <mat-error>{{ message }}</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    mat-form-field { width: 100%; }
    .create-option { font-style: italic; }
  `,
})
export class CreatableComboboxComponent implements OnInit {
  readonly label = input.required<string>();
  readonly options = input.required<ComboboxOption[]>();
  readonly control = input.required<FormControl<string | null>>();
  readonly create = input.required<CreateOption>();
  readonly required = input(false);
  readonly placeholder = input('');

  protected readonly CREATE = CREATE;
  protected readonly text = new FormControl<string | ComboboxOption>('', { nonNullable: true });
  protected readonly query = signal('');
  private readonly selectedId = signal<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly matches = computed(() => {
    const q = normalize(this.query());
    return this.options().filter((o) => normalize(o.name).includes(q));
  });

  protected readonly canCreate = computed(() => {
    const q = normalize(this.query());
    return q.length > 0 && !this.options().some((o) => normalize(o.name) === q);
  });

  /** The outer control holds the value, so its validity decides the field's error state. */
  protected readonly errorState: ErrorStateMatcher = {
    isErrorState: () => this.control().invalid && (this.control().touched || this.text.touched),
  };

  protected readonly display = (value: string | ComboboxOption | null) =>
    typeof value === 'string' ? value : (value?.name ?? '');

  constructor() {
    // Show the selected option's name once both the value and the options are known.
    effect(() => {
      const option = this.options().find((o) => o.id === this.selectedId());
      if (option && this.text.value !== option) this.showOption(option);
    });
  }

  ngOnInit(): void {
    const control = this.control();
    control.valueChanges.pipe(startWith(control.value), takeUntilDestroyed(this.destroyRef)).subscribe((id) => {
      this.selectedId.set(id);
      if (id === null && typeof this.text.value !== 'string') this.showText('');
    });

    this.text.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (typeof value !== 'string') return;
      this.query.set(value);
      // Typing over a selection clears it until the user picks again.
      if (control.value !== null) control.setValue(null);
      control.markAsDirty();
    });
  }

  protected errorMessage(): string | null {
    const errors = this.control().errors;
    if (!errors) return null;
    if (errors['required']) return `${this.label()} is required`;
    if (typeof errors['api'] === 'string') return errors['api'];
    return null;
  }

  protected async select(value: ComboboxOption | typeof CREATE): Promise<void> {
    if (value !== CREATE) {
      this.choose(value);
      return;
    }
    const name = this.query().trim();
    this.showText(name);
    const created = await this.create()(name);
    if (created) this.choose(created);
  }

  private choose(option: ComboboxOption): void {
    this.showOption(option);
    this.control().setValue(option.id);
    this.control().markAsDirty();
  }

  private showOption(option: ComboboxOption): void {
    this.text.setValue(option, { emitEvent: false });
    this.query.set(option.name);
  }

  private showText(value: string): void {
    this.text.setValue(value, { emitEvent: false });
    this.query.set(value);
  }
}
