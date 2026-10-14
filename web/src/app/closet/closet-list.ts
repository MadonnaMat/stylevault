import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ItemsService } from '../core/items.service';
import { Item } from '../core/models';
import { Notifier } from '../core/notifier';
import { SwatchComponent } from '../shared/swatch';

/** `/closet`: every item, newest first. */
@Component({
  selector: 'app-closet-list',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, RouterLink, SwatchComponent],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Your closet</h1>
        @if (items()?.length) {
          <a mat-flat-button routerLink="/closet/new">
            <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
            Add item
          </a>
        }
      </header>

      @if (items(); as items) {
        @if (items.length === 0) {
          <div class="empty-state">
            <mat-icon fontSet="material-symbols-outlined" class="empty-icon">checkroom</mat-icon>
            <h2>Your closet is empty</h2>
            <p>Start cataloging your wardrobe one garment at a time.</p>
            <a mat-flat-button routerLink="/closet/new">Add your first item</a>
          </div>
        } @else {
          <ul class="items" aria-label="Closet items">
            @for (item of items; track item.id) {
              <li>
                <a class="item" [routerLink]="['/closet', item.id]">
                  <span class="swatches">
                    <app-swatch [color]="item.primaryColor" label="Primary color" />
                    @if (item.secondaryColor) {
                      <app-swatch [color]="item.secondaryColor" label="Secondary color" />
                    }
                  </span>
                  <span class="text">
                    <span class="name">{{ item.name }}</span>
                    <span class="meta">
                      <span class="category">{{ item.category?.name ?? 'No category' }}</span>
                      @if (item.brand) {
                        · <span class="brand">{{ item.brand.name }}</span>
                      }
                    </span>
                  </span>
                  <mat-icon fontSet="material-symbols-outlined" class="chevron">chevron_right</mat-icon>
                </a>
              </li>
            }
          </ul>
        }
      } @else {
        <mat-progress-bar mode="indeterminate" />
      }
    </section>
  `,
  styles: `
    .items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface);
      border: 1px solid var(--mat-sys-outline-variant);
      color: inherit;
      text-decoration: none;
      transition: background-color 120ms, box-shadow 120ms;
    }
    .item:hover,
    .item:focus-visible {
      background: var(--mat-sys-surface-container-low);
      box-shadow: var(--mat-sys-level1);
    }
    .swatches { display: flex; gap: 4px; flex: 0 0 48px; }
    .text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .name { font: var(--mat-sys-title-medium); }
    .meta { color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-medium); }
    .chevron { color: var(--mat-sys-on-surface-variant); }
    .empty-state {
      text-align: center;
      padding: 64px 16px;
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-surface);
    }
    .empty-state h2 { font: var(--mat-sys-title-large); margin: 8px 0; }
    .empty-state p { color: var(--mat-sys-on-surface-variant); margin: 0 0 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary); }
  `,
})
export class ClosetListComponent implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly notifier = inject(Notifier);
  /** null while loading. */
  protected readonly items = signal<Item[] | null>(null);

  ngOnInit(): void {
    this.itemsService.list().subscribe({
      next: (items) => this.items.set(items),
      error: (error) => {
        this.items.set([]);
        this.notifier.error(error);
      },
    });
  }
}
