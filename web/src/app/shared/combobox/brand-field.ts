import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BrandsService } from '../../core/brands.service';
import { Brand } from '../../core/models';
import { Notifier } from '../../core/notifier';
import { CreatableComboboxComponent, CreateOption } from './creatable-combobox';

/** The item form's brand field. Optional; creating a brand selects it right away. */
@Component({
  selector: 'app-brand-field',
  imports: [CreatableComboboxComponent],
  template: `
    <app-creatable-combobox
      label="Brand"
      placeholder="Optional"
      [options]="brands()"
      [control]="control()"
      [create]="create"
    />
  `,
})
export class BrandFieldComponent implements OnInit {
  readonly control = input.required<FormControl<string | null>>();

  private readonly service = inject(BrandsService);
  private readonly notifier = inject(Notifier);
  protected readonly brands = signal<Brand[]>([]);

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (brands) => this.brands.set(brands),
      error: (error) => this.notifier.error(error),
    });
  }

  protected readonly create: CreateOption = async (name) => {
    try {
      const brand = await firstValueFrom(this.service.create(name));
      this.brands.update((list) => [...list, brand]);
      return brand;
    } catch (error) {
      this.notifier.error(error);
      return null;
    }
  };
}
