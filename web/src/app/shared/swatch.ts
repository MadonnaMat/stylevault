import { Component, input } from '@angular/core';

/** A round color sample, labelled for screen readers. */
@Component({
  selector: 'app-swatch',
  template: '',
  host: {
    class: 'swatch',
    role: 'img',
    '[attr.aria-label]': "label() + ' ' + color()",
    '[attr.title]': 'color()',
    '[style.background-color]': 'color()',
  },
})
export class SwatchComponent {
  readonly color = input.required<string>();
  readonly label = input('Color');
}
