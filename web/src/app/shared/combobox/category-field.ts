import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import type { Slot } from '@stylevault/shared';
import { firstValueFrom } from 'rxjs';
import { CategoriesService } from '../../core/categories.service';
import { Category } from '../../core/models';
import { Notifier } from '../../core/notifier';
import { CreatableComboboxComponent, CreateOption } from './creatable-combobox';
import { SlotDialogComponent, SlotDialogData } from './slot-dialog';

/** The item form's category field. Creating a category first asks for its slot. */
@Component({
  selector: 'app-category-field',
  imports: [CreatableComboboxComponent],
  template: `
    <app-creatable-combobox
      label="Category"
      placeholder="e.g. Blazers"
      [required]="true"
      [options]="categories()"
      [control]="control()"
      [create]="create"
    />
  `,
})
export class CategoryFieldComponent implements OnInit {
  readonly control = input.required<FormControl<string | null>>();

  private readonly service = inject(CategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  protected readonly categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error) => this.notifier.error(error),
    });
  }

  protected readonly create: CreateOption = async (name) => {
    const ref = this.dialog.open<SlotDialogComponent, SlotDialogData, Slot>(SlotDialogComponent, {
      data: { categoryName: name },
    });
    const slot = await firstValueFrom(ref.afterClosed());
    if (!slot) return null;
    try {
      const category = await firstValueFrom(this.service.create(name, slot));
      this.categories.update((list) => [...list, category]);
      return category;
    } catch (error) {
      this.notifier.error(error);
      return null;
    }
  };
}
