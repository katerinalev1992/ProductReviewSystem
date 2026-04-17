import { Routes } from '@angular/router';
import { ProductListPageComponent } from './pages/product-list-page.component';
import { ProductDetailPageComponent } from './pages/product-detail-page.component';

export const routes: Routes = [
  { path: '', component: ProductListPageComponent },
  { path: 'products/:id', component: ProductDetailPageComponent },
  { path: '**', redirectTo: '' }
];
