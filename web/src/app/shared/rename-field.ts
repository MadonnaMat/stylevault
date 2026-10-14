import { Component, ElementRef, input, OnInit, output, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** An inline name editor. Emits the trimmed new name, or `cancel` (also on Escape). */
@Component({
  selector: 'app-rename-field',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, ReactiveFormsModule],
  template: `
    <form (submit)="$event.preventDefault(); submit()" (keydown.escape)="cancel.emit()">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Name</mat-label>
        <input #input matInput [formControl]="name" />
        @if (name.hasError('required')) {
          <mat-error>Name is required</mat-error>
        }
      </mat-form-field>
      <button mat-icon-button type="submit" aria-label="Save name">
        <mat-icon fontSet="material-symbols-outlined">check</mat-icon>
      </button>
      <button mat-icon-button type="button" aria-label="Cancel rename" (click)="cancel.emit()">
        <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
      </button>
    </form>
  `,
  styles: `
    form { display: flex; align-items: center; gap: 4px; }
    mat-form-field { flex: 1; }
  `,
})
export class RenameFieldComponent implements OnInit {
  readonly initial = input.required<string>();
  readonly save = output<string>();
  readonly cancel = output<void>();

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: (control) => (control.value.trim() ? null : { required: true }),
  });
  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');

  ngOnInit(): void {
    this.name.setValue(this.initial());
    queueMicrotask(() => this.inputEl().nativeElement.select());
  }

  protected submit(): void {
    this.name.markAsTouched();
    if (this.name.invalid) return;
    const name = this.name.value.trim();
    if (name === this.initial()) this.cancel.emit();
    else this.save.emit(name);
  }
}
