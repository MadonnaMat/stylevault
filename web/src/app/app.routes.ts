import { Routes } from '@angular/router';
import { BrandsPageComponent } from './brands/brands-page';
import { CategoriesPageComponent } from './categories/categories-page';
import { ClosetListComponent } from './closet/closet-list';
import { ItemDetailsComponent } from './closet/item-details';
import { ItemFormComponent } from './closet/item-form';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'closet' },
  { path: 'closet', component: ClosetListComponent, title: 'Closet · StyleVault' },
  { path: 'closet/new', component: ItemFormComponent, title: 'Add an item · StyleVault' },
  { path: 'closet/:id', component: ItemDetailsComponent, title: 'Item · StyleVault' },
  { path: 'closet/:id/edit', component: ItemFormComponent, title: 'Edit item · StyleVault' },
  { path: 'categories', component: CategoriesPageComponent, title: 'Categories · StyleVault' },
  { path: 'brands', component: BrandsPageComponent, title: 'Brands · StyleVault' },
  { path: '**', redirectTo: 'closet' },
];
