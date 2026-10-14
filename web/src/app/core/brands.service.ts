import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Brand } from './models';

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/brands';

  /** Sorted by name, ignoring case. */
  list(): Observable<Brand[]> {
    return this.http.get<Brand[]>(this.url);
  }

  create(name: string): Observable<Brand> {
    return this.http.post<Brand>(this.url, { name });
  }

  rename(id: string, name: string): Observable<Brand> {
    return this.http.patch<Brand>(`${this.url}/${id}`, { name });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
