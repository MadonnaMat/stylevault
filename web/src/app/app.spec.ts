import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SLOTS } from '@stylevault/shared';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { ClosetListComponent } from './closet/closet-list';
import { BrandsService } from './core/brands.service';
import { CategoriesService } from './core/categories.service';
import { ItemsService } from './core/items.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ItemsService, useValue: { list: () => of([]) } },
        { provide: CategoriesService, useValue: { list: () => of([]) } },
        { provide: BrandsService, useValue: { list: () => of([]) } },
      ],
    });
  });

  it('can import the shared package', () => {
    expect(SLOTS).toContain('outerwear');
  });

  it('opens the closet by default', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/closet');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(ClosetListComponent);
  });

  describe('navigation', () => {
    it.each([
      ['Categories', '/categories', 'app-categories-page'],
      ['Brands', '/brands', 'app-brands-page'],
      ['Closet', '/closet', 'app-closet-list'],
    ])('the %s link reaches its page', async (label, url, selector) => {
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      await router.navigateByUrl(label === 'Closet' ? '/brands' : '/closet');
      await fixture.whenStable();

      const link = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('nav a')].find(
        (a) => a.textContent?.trim() === label,
      )!;
      link.click();
      await fixture.whenStable();

      expect(router.url).toBe(url);
      expect(link.classList).toContain('active');
      expect(fixture.nativeElement.querySelector(selector)).not.toBeNull();
    });
  });
});
