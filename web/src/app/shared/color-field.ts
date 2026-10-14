import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { isHexColor, normalizeHex } from '@stylevault/shared';
import { startWith } from 'rxjs';

/** Rejects text that isn't `#RGB` or `#RRGGBB`. Empty values are left to `Validators.required`. */
export function hexColorValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value?.trim();
  return !value || isHexColor(value) ? null : { hexColor: true };
}

/**
 * A hex color text field paired with a native color picker. The text is the source of
 * truth, since the picker can only show `#rrggbb`: typing a valid code updates the swatch,
 * and picking a color fills in the text.
 */
@Component({
  selector: 'app-color-field',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ label() }}</mat-label>
      <input
        matPrefix
        type="color"
        class="picker"
        [attr.aria-label]="label() + ' picker'"
        [value]="pickerValue()"
        [disabled]="control().disabled"
        (input)="pick($any($event.target).value)"
      />
      <input matInput [formControl]="control()" [required]="required()" placeholder="#1f2a44" spellcheck="false" />
      <mat-hint>#RGB or #RRGGBB</mat-hint>
      @if (control().hasError('required')) {
        <mat-error>{{ label() }} is required</mat-error>
      } @else if (control().hasError('hexColor')) {
        <mat-error>{{ label() }} must be a hex color like #1f2a44 or #fa0</mat-error>
      } @else if (control().getError('api'); as message) {
        <mat-error>{{ message }}</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    mat-form-field { width: 100%; }
    .picker {
      width: 32px;
      height: 32px;
      margin: 0 4px 0 12px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
    }
  `,
})
export class ColorFieldComponent implements OnInit {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string | null>>();
  readonly required = input(false);

  /** The picker shows the typed color when it's valid, and stays on its last color otherwise. */
  protected readonly pickerValue = signal('#000000');
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const control = this.control();
    control.valueChanges.pipe(startWith(control.value), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const text = value?.trim();
      if (isHexColor(text)) this.pickerValue.set(normalizeHex(text) as string);
    });
  }

  protected pick(value: string): void {
    this.control().setValue(value);
    this.control().markAsDirty();
  }
}
