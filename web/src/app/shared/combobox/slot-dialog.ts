import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { SLOTS, type Slot } from '@stylevault/shared';
import { slotLabel } from '../labels';

export interface SlotDialogData {
  categoryName: string;
}

/** Asks where a new category is worn. Closes with the chosen slot, or nothing if cancelled. */
@Component({
  selector: 'app-slot-dialog',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>New category: {{ data.categoryName }}</h2>
    <mat-dialog-content>
      <p id="slot-question">Where is it worn?</p>
      <mat-radio-group aria-labelledby="slot-question" [(ngModel)]="slot" class="slots">
        @for (s of slots; track s) {
          <mat-radio-button [value]="s">{{ slotLabel(s) }}</mat-radio-button>
        }
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [mat-dialog-close]="slot" [disabled]="!slot">Create</button>
    </mat-dialog-actions>
  `,
  styles: `
    .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  `,
})
export class SlotDialogComponent {
  protected readonly data = inject<SlotDialogData>(MAT_DIALOG_DATA);
  protected readonly slots = SLOTS;
  protected readonly slotLabel = slotLabel;
  protected slot: Slot | null = null;
}
