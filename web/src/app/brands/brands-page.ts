import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiError, usedByMessage } from '../core/api-error';
import { BrandsService } from '../core/brands.service';
import { Brand } from '../core/models';
import { Notifier } from '../core/notifier';
import { RenameFieldComponent } from '../shared/rename-field';
import { byName } from '../shared/sort';

/** `/brands`: list, rename, delete. */
@Component({
  selector: 'app-brands-page',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, RenameFieldComponent],
  template: `
    <section class="page narrow">
      <header class="page-header"><h1>Brands</h1></header>

      @if (brands(); as brands) {
        @if (brands.length === 0) {
          <p class="empty">No brands yet. You can create them while adding an item.</p>
        } @else {
          <ul class="rows" aria-label="Brands">
            @for (brand of brands; track brand.id) {
              <li class="row">
                @if (editingId() === brand.id) {
                  <app-rename-field class="name" [initial]="brand.name" (save)="rename(brand, $event)" (cancel)="editingId.set(null)" />
                } @else {
                  <span class="name">{{ brand.name }}</span>
                  <button mat-icon-button [attr.aria-label]="'Rename ' + brand.name" (click)="editingId.set(brand.id)">
                    <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                  </button>
                }
                <button mat-icon-button [attr.aria-label]="'Delete ' + brand.name" (click)="remove(brand)">
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
export class BrandsPageComponent implements OnInit {
  private readonly service = inject(BrandsService);
  private readonly notifier = inject(Notifier);

  /** null while loading. */
  protected readonly brands = signal<Brand[] | null>(null);
  protected readonly editingId = signal<string | null>(null);

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (brands) => this.brands.set(brands),
      error: (error) => {
        this.brands.set([]);
        this.notifier.error(error);
      },
    });
  }

  protected rename(brand: Brand, name: string): void {
    this.service.rename(brand.id, name).subscribe({
      next: (updated) => {
        this.brands.update((list) => byName((list ?? []).map((b) => (b.id === updated.id ? updated : b))));
        this.editingId.set(null);
      },
      error: (error) => this.fail(brand, error),
    });
  }

  protected remove(brand: Brand): void {
    this.service.delete(brand.id).subscribe({
      next: () => {
        this.drop(brand);
        this.notifier.info(`Deleted "${brand.name}"`);
      },
      error: (error) => this.fail(brand, error),
    });
  }

  private fail(brand: Brand, error: unknown): void {
    if (error instanceof ApiError && error.status === 409 && error.itemCount !== undefined) {
      this.notifier.error(new ApiError(409, error.title, `Can't delete "${brand.name}": ${usedByMessage(error.itemCount)}`));
    } else {
      if (error instanceof ApiError && error.status === 404) this.drop(brand);
      this.notifier.error(error);
    }
  }

  private drop(brand: Brand): void {
    this.brands.update((list) => (list ?? []).filter((b) => b.id !== brand.id));
  }
}
