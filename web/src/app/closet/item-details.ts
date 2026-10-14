import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ApiError } from '../core/api-error';
import { ItemsService } from '../core/items.service';
import { Item } from '../core/models';
import { Notifier } from '../core/notifier';
import { ConfirmDialogComponent, ConfirmDialogData } from '../shared/confirm-dialog';
import { occasionLabel, seasonLabel, slotLabel } from '../shared/labels';
import { SwatchComponent } from '../shared/swatch';

/** `/closet/:id`: one item with every attribute. */
@Component({
  selector: 'app-item-details',
  imports: [MatButtonModule, MatChipsModule, MatIconModule, MatProgressBarModule, RouterLink, SwatchComponent],
  template: `
    <section class="page narrow">
      @if (notFound()) {
        <div class="not-found">
          <h1>Item not found</h1>
          <p>It may have been deleted.</p>
          <a mat-flat-button routerLink="/closet">Back to your closet</a>
        </div>
      } @else if (item(); as item) {
        <a mat-button routerLink="/closet" class="back">
          <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
          Closet
        </a>
        <header class="page-header">
          <h1>{{ item.name }}</h1>
          <div class="actions">
            <a mat-stroked-button [routerLink]="['/closet', item.id, 'edit']">
              <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
              Edit
            </a>
            <button mat-stroked-button class="delete" (click)="confirmDelete(item)">
              <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
              Delete
            </button>
          </div>
        </header>

        <dl class="attributes">
          <dt>Category</dt>
          <dd class="category">
            @if (item.category; as category) {
              {{ category.name }} <span class="slot">{{ slotLabel(category.slot) }}</span>
            } @else {
              <span class="none">None</span>
            }
          </dd>

          <dt>Brand</dt>
          <dd class="brand">
            @if (item.brand; as brand) { {{ brand.name }} } @else { <span class="none">None</span> }
          </dd>

          <dt>Colors</dt>
          <dd class="colors">
            <span class="color">
              <app-swatch [color]="item.primaryColor" label="Primary color" />
              <code>{{ item.primaryColor }}</code>
            </span>
            @if (item.secondaryColor; as secondary) {
              <span class="color">
                <app-swatch [color]="secondary" label="Secondary color" />
                <code>{{ secondary }}</code>
              </span>
            }
          </dd>

          <dt>Seasons</dt>
          <dd class="seasons">
            @for (season of item.seasons; track season) {
              <span class="tag">{{ seasonLabel(season) }}</span>
            } @empty {
              <span class="none">None</span>
            }
          </dd>

          <dt>Occasions</dt>
          <dd class="occasions">
            @for (occasion of item.occasions; track occasion) {
              <span class="tag">{{ occasionLabel(occasion) }}</span>
            } @empty {
              <span class="none">None</span>
            }
          </dd>

          <dt>Notes</dt>
          <dd class="notes">
            @if (item.notes) { {{ item.notes }} } @else { <span class="none">None</span> }
          </dd>
        </dl>
      } @else {
        <mat-progress-bar mode="indeterminate" />
      }
    </section>
  `,
  styles: `
    .narrow { max-width: 720px; }
    .back { margin: 0 0 8px -12px; }
    .actions { display: flex; gap: 8px; }
    .delete { --mat-button-outlined-label-text-color: var(--mat-sys-error); }
    .attributes {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 16px 24px;
      margin: 0;
      padding: 24px;
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    dt { font: var(--mat-sys-title-small); color: var(--mat-sys-on-surface-variant); }
    dd { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; white-space: pre-wrap; }
    .slot, .tag {
      font: var(--mat-sys-label-medium);
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .color { display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; }
    .none { color: var(--mat-sys-on-surface-variant); }
    .not-found { text-align: center; padding: 48px 16px; }
    @media (max-width: 600px) { .attributes { grid-template-columns: 1fr; gap: 4px; } dd { margin-bottom: 12px; } }
  `,
})
export class ItemDetailsComponent implements OnInit {
  /** From the `:id` route parameter. */
  readonly id = input.required<string>();

  private readonly itemsService = inject(ItemsService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly router = inject(Router);

  protected readonly item = signal<Item | null>(null);
  protected readonly notFound = signal(false);
  protected readonly slotLabel = slotLabel;
  protected readonly seasonLabel = seasonLabel;
  protected readonly occasionLabel = occasionLabel;

  ngOnInit(): void {
    this.itemsService.get(this.id()).subscribe({
      next: (item) => this.item.set(item),
      error: (error) => this.handleError(error),
    });
  }

  protected confirmDelete(item: Item): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete this item?',
          message: `"${item.name}" will be removed from your closet. Its category and brand are kept.`,
          confirmLabel: 'Delete',
        },
      })
      .afterClosed()
      .pipe(
        filter((confirmed) => confirmed === true),
        switchMap(() => this.itemsService.delete(item.id)),
      )
      .subscribe({
        next: () => {
          this.notifier.info('Item deleted');
          void this.router.navigate(['/closet']);
        },
        error: (error) => this.handleError(error),
      });
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiError && error.status === 404) {
      this.item.set(null);
      this.notFound.set(true);
    } else {
      this.notifier.error(error);
    }
  }
}
