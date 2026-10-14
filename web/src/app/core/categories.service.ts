import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Slot } from '@stylevault/shared';
import { Observable } from 'rxjs';
import { Category } from './models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/categories';

  /** Sorted by name, ignoring case. */
  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.url);
  }

  create(name: string, slot: Slot): Observable<Category> {
    return this.http.post<Category>(this.url, { name, slot });
  }

  update(id: string, changes: Partial<Pick<Category, 'name' | 'slot'>>): Observable<Category> {
    return this.http.patch<Category>(`${this.url}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
