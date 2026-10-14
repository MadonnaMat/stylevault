import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiError, apiErrorInterceptor, usedByMessage } from './api-error';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { ItemInput } from './models';
import { ItemsService } from './items.service';

const problem = (status: number, title: string, detail: string, extra: object = {}) => ({
  type: 'about:blank',
  title,
  status,
  detail,
  ...extra,
});

describe('API services', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  /** Subscribes, answers the single pending request with `body`, and returns what was sent. */
  async function call<T>(obs: Observable<T>, method: string, url: string, body: object | null = null) {
    const result = firstValueFrom(obs);
    const req = http.expectOne({ method, url });
    req.flush(body, method === 'DELETE' ? { status: 204, statusText: 'No Content' } : undefined);
    return { sent: req.request.body, result: await result };
  }

  describe('CategoriesService', () => {
    const categories = () => TestBed.inject(CategoriesService);

    it('lists categories', async () => {
      const list = [{ id: '1', name: 'Blazers', slot: 'outerwear' }];
      expect((await call(categories().list(), 'GET', '/api/categories', list)).result).toEqual(list);
    });

    it('creates a category with a slot', async () => {
      const { sent } = await call(categories().create('Cardigans', 'top'), 'POST', '/api/categories', {});
      expect(sent).toEqual({ name: 'Cardigans', slot: 'top' });
    });

    it('updates a category', async () => {
      const { sent } = await call(categories().update('1', { slot: 'outerwear' }), 'PATCH', '/api/categories/1', {});
      expect(sent).toEqual({ slot: 'outerwear' });
    });

    it('deletes a category', async () => {
      await call(categories().delete('1'), 'DELETE', '/api/categories/1');
    });
  });

  describe('BrandsService', () => {
    const brands = () => TestBed.inject(BrandsService);

    it('lists brands', async () => {
      expect((await call(brands().list(), 'GET', '/api/brands', [])).result).toEqual([]);
    });

    it('creates a brand', async () => {
      const { sent } = await call(brands().create('Patagonia'), 'POST', '/api/brands', {});
      expect(sent).toEqual({ name: 'Patagonia' });
    });

    it('renames a brand', async () => {
      const { sent } = await call(brands().rename('2', "Levi's"), 'PATCH', '/api/brands/2', {});
      expect(sent).toEqual({ name: "Levi's" });
    });

    it('deletes a brand', async () => {
      await call(brands().delete('2'), 'DELETE', '/api/brands/2');
    });
  });

  describe('ItemsService', () => {
    const items = () => TestBed.inject(ItemsService);
    const input: ItemInput = {
      name: 'Navy wool blazer',
      categoryId: '1',
      brandId: null,
      primaryColor: '#1f2a44',
      secondaryColor: null,
      seasons: ['fall'],
      occasions: [],
      notes: null,
    };

    it('lists items', async () => {
      await call(items().list(), 'GET', '/api/items', []);
    });

    it('gets one item', async () => {
      await call(items().get('9'), 'GET', '/api/items/9', {});
    });

    it('creates an item', async () => {
      const { sent } = await call(items().create(input), 'POST', '/api/items', {});
      expect(sent).toEqual(input);
    });

    it('updates an item, sending null to clear optional fields', async () => {
      const { sent } = await call(items().update('9', { brandId: null, secondaryColor: null }), 'PATCH', '/api/items/9', {});
      expect(sent).toEqual({ brandId: null, secondaryColor: null });
    });

    it('deletes an item', async () => {
      await call(items().delete('9'), 'DELETE', '/api/items/9');
    });
  });

  describe('error responses', () => {
    async function failWith(status: number, statusText: string, body: object | string): Promise<ApiError> {
      const result = firstValueFrom(TestBed.inject(ItemsService).get('9'));
      http.expectOne('/api/items/9').flush(body, { status, statusText });
      try {
        await result;
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        return error as ApiError;
      }
      throw new Error('expected the request to fail');
    }

    it('surfaces a 400', async () => {
      const error = await failWith(400, 'Bad Request', problem(400, 'Bad Request', 'Unexpected end of JSON input'));
      expect(error).toMatchObject({ status: 400, title: 'Bad Request', detail: 'Unexpected end of JSON input' });
    });

    it('surfaces a 404', async () => {
      const error = await failWith(404, 'Not Found', problem(404, 'Not Found', 'Item not found.'));
      expect(error).toMatchObject({ status: 404, detail: 'Item not found.' });
    });

    it('surfaces a 409 with its itemCount', async () => {
      const error = await failWith(409, 'Conflict', problem(409, 'Conflict', 'Category "Shirts" is used by 4 items.', { itemCount: 4 }));
      expect(error).toMatchObject({ status: 409, itemCount: 4 });
    });

    it('surfaces a 422 with field errors keyed by field', async () => {
      const error = await failWith(
        422,
        'Unprocessable Entity',
        problem(422, 'Unprocessable Entity', 'The request has invalid fields.', {
          errors: [
            { field: 'primaryColor', message: 'primary color "navy" is not a valid hex color (use #RGB or #RRGGBB)' },
            { field: 'name', message: 'name is required' },
          ],
        }),
      );
      expect(error.status).toBe(422);
      expect(error.fieldErrors).toEqual({
        primaryColor: 'primary color "navy" is not a valid hex color (use #RGB or #RRGGBB)',
        name: 'name is required',
      });
    });

    it('surfaces an error without a Problem Details body', async () => {
      const error = await failWith(500, 'Internal Server Error', 'oops');
      expect(error).toMatchObject({ status: 500, title: 'Internal Server Error', fieldErrors: {} });
    });
  });

  it('formats the blocked-delete message', () => {
    expect(usedByMessage(1)).toBe('Used by 1 item');
    expect(usedByMessage(4)).toBe('Used by 4 items');
  });
});
