import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { SLOTS, type Slot } from '@stylevault/shared';
import { ApiError, usedByMessage } from '../core/api-error';
import { CategoriesService } from '../core/categories.service';
import { Category } from '../core/models';
import { Notifier } from '../core/notifier';
import { slotLabel } from '../shared/labels';
import { RenameFieldComponent } from '../shared/rename-field';
import { byName } from '../shared/sort';

/** `/categories`: list, rename, change slot, delete. */
@Component({
  selector: 'app-categories-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatProgressBarModule, MatSelectModule, RenameFieldComponent],
  template: `
    <section class="page narrow">
      <header class="page-header"><h1>Categories</h1></header>

      @if (categories(); as categories) {
        @if (categories.length === 0) {
          <p class="empty">No categories yet. You can create them while adding an item.</p>
        } @else {
          <ul class="rows" aria-label="Categories">
            @for (category of categories; track category.id) {
              <li class="row">
                @if (editingId() === category.id) {
                  <app-rename-field
                    class="name"
                    [initial]="category.name"
                    (save)="rename(category, $event)"
                    (cancel)="editingId.set(null)"
                  />
                } @else {
                  <span class="name">{{ category.name }}</span>
                  <button mat-icon-button [attr.aria-label]="'Rename ' + category.name" (click)="editingId.set(category.id)">
                    <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                  </button>
                }
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="slot">
                  <mat-label>Slot</mat-label>
                  <mat-select
                    [value]="category.slot"
                    [aria-label]="'Slot for ' + category.name"
                    (selectionChange)="changeSlot(category, $event)"
                  >
                    @for (slot of slots; track slot) {
                      <mat-option [value]="slot">{{ slotLabel(slot) }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button [attr.aria-label]="'Delete ' + category.name" (click)="remove(category)">
                  <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                </button>
              </li>
            }
          </ul>
        }
      } @else {
        <mat-progress-bar mode="indeterminate" />
      }
    </section>
  `,
  styleUrl: '../shared/manage-page.scss',
})
export class CategoriesPageComponent implements OnInit {
  private readonly service = inject(CategoriesService);
  private readonly notifier = inject(Notifier);

  protected readonly slots = SLOTS;
  protected readonly slotLabel = slotLabel;
  /** null while loading. */
  protected readonly categories = signal<Category[] | null>(null);
  protected readonly editingId = signal<string | null>(null);

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error) => {
        this.categories.set([]);
        this.notifier.error(error);
      },
    });
  }

  protected rename(category: Category, name: string): void {
    this.service.update(category.id, { name }).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.editingId.set(null);
      },
      error: (error) => this.fail(category, error),
    });
  }

  protected changeSlot(category: Category, change: MatSelectChange<Slot>): void {
    this.service.update(category.id, { slot: change.value }).subscribe({
      next: (updated) => this.replace(updated),
      error: (error) => {
        // Put the select back on the stored slot.
        change.source.value = category.slot;
        this.fail(category, error);
      },
    });
  }

  protected remove(category: Category): void {
    this.service.delete(category.id).subscribe({
      next: () => {
        this.drop(category);
        this.notifier.info(`Deleted "${category.name}"`);
      },
      error: (error) => this.fail(category, error),
    });
  }

  private fail(category: Category, error: unknown): void {
    if (error instanceof ApiError && error.status === 409 && error.itemCount !== undefined) {
      this.notifier.error(new ApiError(409, error.title, `Can't delete "${category.name}": ${usedByMessage(error.itemCount)}`));
    } else {
      if (error instanceof ApiError && error.status === 404) this.drop(category);
      this.notifier.error(error);
    }
  }

  private replace(category: Category): void {
    this.categories.update((list) => byName((list ?? []).map((c) => (c.id === category.id ? category : c))));
  }

  private drop(category: Category): void {
    this.categories.update((list) => (list ?? []).filter((c) => c.id !== category.id));
  }
}
