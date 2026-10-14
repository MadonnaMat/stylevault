import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Item, ItemInput } from './models';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/items';

  /** Newest first. */
  list(): Observable<Item[]> {
    return this.http.get<Item[]>(this.url);
  }

  get(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.url}/${id}`);
  }

  create(input: ItemInput): Observable<Item> {
    return this.http.post<Item>(this.url, input);
  }

  /** `null` for brandId, secondaryColor, or notes clears that field. */
  update(id: string, changes: Partial<ItemInput>): Observable<Item> {
    return this.http.patch<Item>(`${this.url}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
